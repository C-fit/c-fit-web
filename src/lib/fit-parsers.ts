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

// 내부 유틸 타입/가드
type UnknownRecord = Record<string, unknown>;

const isRecord = (v: unknown): v is UnknownRecord =>
  typeof v === 'object' && v !== null;

const isString = (v: unknown): v is string => typeof v === 'string';

const isNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every(isString);

const isDimArray = (v: unknown): v is { name: string; score: number }[] =>
  Array.isArray(v) &&
  v.every(
    (d) =>
      isRecord(d) && isString(d.name) && isNumber(d.score)
  );

// 가장 긴 문자열을 골라주는 유틸
function longestString(obj: unknown): string | undefined {
  if (!isRecord(obj)) return undefined;
  const strings = Object.values(obj).filter(isString);
  return strings.sort((a, b) => (b?.length ?? 0) - (a?.length ?? 0))[0];
}

// raw 블록에 허용할 느슨한 구조
type FitRawLoose = {
  score?: unknown;
  summary?: unknown;
  dimensions?: unknown;
  strengths?: unknown;
  gaps?: unknown;
  recommendations?: unknown;
  text?: unknown;
  rawText?: unknown;
  content?: unknown;
  report?: unknown;
};

// 어떤 형태로 오든 원문 텍스트를 꺼냄
function getRawTextFromItem(item: unknown): string {
  if (!item || !isRecord(item)) return '';

  // item.raw가 문자열인 경우
  if (isString(item.raw)) return item.raw;

  // item.rawText가 문자열인 경우
  if (isString(item.rawText)) return item.rawText;

  // item.raw가 객체인 경우: text/rawText/content/report 키 우선
  if (isRecord(item.raw)) {
    const raw = item.raw as FitRawLoose;
    const candidates = [raw.text, raw.rawText, raw.content, raw.report];
    for (const v of candidates) {
      if (isString(v) && v.trim().length > 0) return v;
    }
    const longest = longestString(item.raw);
    if (longest) return longest;
  }

  // summary가 문자열이면 fallback
  if (isString(item.summary)) return item.summary;

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

export function parseResumeReview(text: string): FitView {
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

export function parseComparisonReport(text: string): FitView {
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

// normalize 대상 아이템의 느슨한 형태
type FitItemLoose = {
  raw?: unknown;
  rawText?: unknown;
  summary?: unknown;
  score?: unknown;
  strengths?: unknown;
  gaps?: unknown;
  recommendations?: unknown;
};

export function normalizeFit(item: unknown): FitView {
  const it = isRecord(item) ? (item as UnknownRecord & FitItemLoose) : undefined;

  // 1) 구조화된 raw 우선
  if (it && isRecord(it.raw)) {
    const raw = it.raw as FitRawLoose;

    const rawScore = isNumber(raw.score) ? raw.score : undefined;
    const rawSummary = isString(raw.summary) ? raw.summary : undefined;
    const rawDims = isDimArray(raw.dimensions) ? raw.dimensions : undefined;
    const rawStrengths = isStringArray(raw.strengths) ? raw.strengths : undefined;
    const rawGaps = isStringArray(raw.gaps) ? raw.gaps : undefined;
    const rawRecs = isStringArray(raw.recommendations) ? raw.recommendations : undefined;

    if (
      rawScore !== undefined ||
      rawDims !== undefined
    ) {
      return {
        score: rawScore ?? (isNumber(it.score) ? it.score : undefined),
        summary:
          rawSummary ??
          (isString(it.summary) ? it.summary : undefined) ??
          pickSummary(getRawTextFromItem(it)),
        dimensions: rawDims,
        strengths:
          rawStrengths ??
          (isStringArray(it.strengths) ? it.strengths : []) ??
          [],
        gaps:
          rawGaps ?? (isStringArray(it.gaps) ? it.gaps : []) ?? [],
        recommendations:
          rawRecs ??
          (isStringArray(it.recommendations) ? it.recommendations : []) ??
          [],
        rawText: getRawTextFromItem(it),
      };
    }
  }

  // 2) 원문 텍스트 기반 파싱
  const text = getRawTextFromItem(item);
  if (!text) {
    return {
      score: isRecord(item) && isNumber((item as UnknownRecord).score)
        ? ((item as UnknownRecord).score as number)
        : undefined,
      summary:
        isRecord(item) && isString((item as UnknownRecord).summary)
          ? ((item as UnknownRecord).summary as string)
          : undefined,
      rawText: '',
    };
  }

  // 유형 감지: 키워드로 유연하게 결정
  const isResumeReview =
    /첨삭|가독성|문서|역량\s*점수|기술\s*역량|문제\s*해결|오너십|협업/.test(text);

  return isResumeReview ? parseResumeReview(text) : parseComparisonReport(text);
}
