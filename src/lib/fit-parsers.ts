// src/lib/fit-parsers.ts
export type FitView = {
  score?: number;
  summary?: string;
  dimensions?: { name: string; score: number }[];
  strengths?: string[];
  gaps?: string[];
  recommendations?: string[];
  rawText?: string;
};

// 가장 긴 문자열을 골라주는 유틸
function longestString(obj: any): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const strings = Object.values(obj).filter(
    (v) => typeof v === 'string'
  ) as string[];
  return strings.sort((a, b) => (b?.length ?? 0) - (a?.length ?? 0))[0];
}

// 어떤 형태로 오든 원문 텍스트를 꺼냄
function getRawTextFromItem(item: any): string {
  if (!item) return '';
  if (typeof item.raw === 'string') return item.raw;
  if (typeof item.rawText === 'string') return item.rawText;
  if (item.raw && typeof item.raw === 'object') {
    for (const key of ['text', 'rawText', 'content', 'report']) {
      const v = (item.raw as any)[key];
      if (typeof v === 'string' && v.trim().length > 0) return v;
    }
    const longest = longestString(item.raw);
    if (longest) return longest;
  }
  if (typeof item.summary === 'string') return item.summary;
  return '';
}

function extractTotalScore(text: string): number | undefined {
  const m =
    text.match(/총\s*점\s*(\d{1,3})\s*점/) ||
    text.match(/overall\s*score[:\s]+(\d{1,3})/i) ||
    text.match(/(\d{1,3})\s*\/\s*100\s*점?/);
  return m ? Math.min(100, parseInt(m[1], 10)) : undefined;
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function pickSummary(text: string): string | undefined {
  const ps = splitParagraphs(text);
  if (!ps.length) return undefined;
  // 첫 단락이 길면 앞 2~3문장만
  const first = ps[0];
  const sents = first
    .split(/(?<=[.!?…]|[가-힣]\.)\s+/)
    .slice(0, 3)
    .join(' ');
  return sents || first.slice(0, 300);
}

function extractBullets(text: string, titleRe: RegExp): string[] {
  // 제목 줄 ~ 다음 공백 줄 사이의 불릿을 긁어오기 (•, -, * 모두)
  const m = text.match(
    new RegExp(`${titleRe.source}[\\s\\S]*?(?=\\n\\s*\\n|$)`, titleRe.flags)
  );
  if (!m) return [];
  return m[0]
    .split(/\n/)
    .slice(1)
    .map((s) => s.replace(/^[\-\*\•]\s*/, '').trim())
    .filter(Boolean);
}

export function parseResumeReview(text: string) {
  const view: FitView = { rawText: text };
  view.score = extractTotalScore(text);
  // 역량 레이더 후보 키워드
  const dims: { name: string; score: number }[] = [];
  for (const m of text.matchAll(
    /(기술\s*역량|문제\s*해결|학습|성장|오너십|협업|소통)[^\n]*?(\d{1,3})\s*점/g
  )) {
    dims.push({
      name: m[1].replace(/\s+/g, ' '),
      score: Math.min(100, parseInt(m[2], 10)),
    });
  }
  if (dims.length) view.dimensions = dims;

  view.strengths = extractBullets(text, /(강점|부각해야\s*할\s*점)/);
  view.gaps = extractBullets(text, /(아쉽|부족|개선\s*필요)/);
  view.recommendations = extractBullets(text, /(추천|액션|더\s*쌓아야|제안)/);

  view.summary = pickSummary(text);
  return view;
}

export function parseComparisonReport(text: string) {
  const view: FitView = { rawText: text };
  view.score = extractTotalScore(text);

  const dims: { name: string; score: number }[] = [];
  for (const m of text.matchAll(
    /(직무.?기술|기술.?적합성|유사.?프로덕트|개인.?역량|커뮤니케이션|협업)[^\n]*?(\d{1,3})\s*\/\s*(\d{1,3})\s*점/g
  )) {
    const pct = Math.round(
      (parseInt(m[2], 10) / Math.max(1, parseInt(m[3], 10))) * 100
    );
    dims.push({
      name: m[1].replace(/\s+/g, ''),
      score: Math.max(0, Math.min(100, pct)),
    });
  }
  if (!dims.length) {
    // (이름 숫자점) 패턴도 허용
    for (const m of text.matchAll(
      /(직무.?기술|유사.?프로덕트|개인.?역량|커뮤니케이션|협업)[^\n]*?(\d{1,3})\s*점/g
    )) {
      dims.push({
        name: m[1].replace(/\s+/g, ''),
        score: Math.min(100, parseInt(m[2], 10)),
      });
    }
  }
  if (dims.length) view.dimensions = dims;

  view.strengths = extractBullets(text, /(강점|부각해야\s*할\s*점)/);
  view.gaps = extractBullets(text, /(아쉽|부족|개선\s*필요)/);
  view.recommendations = extractBullets(
    text,
    /(추천|액션|더\s*쌓아야|제안|스토리텔링)/
  );

  view.summary = pickSummary(text);
  return view;
}

export function normalizeFit(item: any): FitView {
  // 1) 구조화된 raw 우선
  if (
    item?.raw &&
    typeof item.raw === 'object' &&
    (item.raw.score || item.raw.dimensions)
  ) {
    return {
      score: item.raw.score ?? item.score,
      summary:
        item.raw.summary ??
        item.summary ??
        pickSummary(getRawTextFromItem(item)),
      dimensions: item.raw.dimensions,
      strengths: item.raw.strengths ?? item.strengths ?? [],
      gaps: item.raw.gaps ?? item.gaps ?? [],
      recommendations: item.raw.recommendations ?? item.recommendations ?? [],
      rawText: getRawTextFromItem(item),
    };
  }

  // 2) 원문 텍스트 기반 파싱
  const text = getRawTextFromItem(item);
  if (!text) return { score: item?.score, summary: item?.summary, rawText: '' };

  // 유형 감지: 키워드로 유연하게 결정
  const isResumeReview =
    /첨삭|가독성|문서|역량\s*점수|기술\s*역량|문제\s*해결|오너십|협업/.test(
      text
    );

  return isResumeReview ? parseResumeReview(text) : parseComparisonReport(text);
}
