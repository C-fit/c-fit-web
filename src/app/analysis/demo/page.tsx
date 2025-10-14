'use client';

import { useEffect, useMemo, useState } from 'react';

type ScoreItem = { name: string; score: number; total: number; pct: number };

function extractOverallScores(md: string): ScoreItem[] {
  // "| 항목 | 64.5/100 |" 형태 라인 파싱
  const re = /^\|\s*([^|]+?)\s*\|\s*([\d.]+)\s*\/\s*(\d+)\s*\|/gm;
  const found: ScoreItem[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    const name = m[1].trim();
    const score = parseFloat(m[2]);
    const total = parseFloat(m[3]);
    if (!Number.isFinite(score) || !Number.isFinite(total)) continue;
    found.push({
      name,
      score,
      total,
      pct: Math.max(0, Math.min(100, (score / total) * 100)),
    });
  }
  const priority = ['직무 및 기술 적합성', '오너십', '협업 및 소통'];
  const prioritized = priority
    .map((p) => found.find((f) => f.name.includes(p)))
    .filter(Boolean) as ScoreItem[];
  const rest = found.filter((f) => !prioritized.some((p) => p.name === f.name));
  return [...prioritized, ...rest].slice(0, 5);
}

function Meter({ pct }: { pct: number }) {
  const w = `${pct.toFixed(0)}%`;
  return (
    <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden bg-gray-200">
      <div className="h-full bg-gray-900" style={{ width: w }} />
    </div>
  );
}

const SIMPLE_SAMPLE = JSON.stringify(
  {
    applicant_recruitment:
      [
        '# Front-end 엔지니어 경력직 지원자 서류 평가 보고서',
        '',
        '## 종합 분석 결과',
        '',
        '| 심사 결과 | 점수 |',
        '| --- | --- |',
        '| 직무 및 기술 적합성 | 64.5/100 |',
        '| 오너십 | 50/100 |',
        '| 협업 및 소통 | 75/100 |',
        '',
        '## 기준 별 세부 분석',
        '... (여기에 나머지 마크다운 이어붙이면 완전 동일하게 보입니다)',
      ].join('\n'),
  },
  null,
  2
);

export default function FitDemoPage() {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);

  // localStorage에 자동 저장/복원(편의)
  useEffect(() => {
    const saved = localStorage.getItem('fit_demo_raw');
    if (saved) setRaw(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem('fit_demo_raw', raw);
  }, [raw]);

  const parsed = useMemo(() => {
    if (!raw.trim()) {
      setError(null);
      return null;
    }
    try {
      const obj = JSON.parse(raw);
      setError(null);
      return obj as Record<string, unknown>;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }, [raw]);

  const md =
    parsed && typeof parsed['applicant_recruitment'] === 'string'
      ? (parsed['applicant_recruitment'] as string)
      : null;

  const scores = md ? extractOverallScores(md) : [];

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">FIT 보고서 미리보기 (Raw JSON 붙여넣기)</h1>
        <p className="text-sm text-gray-500">
          아래 입력창에 <code>{`{ "applicant_recruitment": "..." }`}</code> 형태의 JSON을 붙여넣고 미리보기를 확인하세요.
          (아까 주신 예시 그대로 붙여넣으면 됩니다)
        </p>
      </header>

      <section className="grid gap-3">
        <div className="flex gap-2">
          <button
            className="rounded bg-black px-3 py-2 text-white"
            onClick={() => setRaw(SIMPLE_SAMPLE)}
            type="button"
          >
            간단 샘플 채우기
          </button>
          <button
            className="rounded border px-3 py-2"
            onClick={() => setRaw('')}
            type="button"
          >
            초기화
          </button>
        </div>

        <textarea
          className="w-full h-64 border rounded p-3 font-mono text-sm"
          placeholder='여기에 JSON 붙여넣기 (예: {"applicant_recruitment":"# 제목...\n| 표 | 64/100 | ..."})'
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          spellCheck={false}
        />
        {error && (
          <div className="text-sm text-red-600">
            JSON 파싱 오류: {error}
          </div>
        )}
      </section>

      {/* 프리뷰 */}
      <section className="space-y-6">
        {md ? (
          <>
            {/* 핵심 점수 카드 */}
            {scores.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {scores.map((s) => (
                  <div key={s.name} className="rounded-lg border p-4">
                    <div className="mb-1 text-sm text-gray-500">{s.name}</div>
                    <div className="flex items-baseline justify-between">
                      <div className="text-xl font-bold">
                        {s.score}/{s.total}
                      </div>
                      <div className="text-sm text-gray-500">
                        {s.pct.toFixed(0)}%
                      </div>
                    </div>
                    <div className="mt-2">
                      <Meter pct={s.pct} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 마크다운 원문(간단 렌더: 라이브러리 없이) */}
            <div className="rounded-lg border p-4">
              <div className="text-sm text-gray-500">보고서(마크다운)</div>
              <article className="prose max-w-none mt-2">
                <pre className="whitespace-pre-wrap break-words leading-relaxed text-sm">
{md}
                </pre>
              </article>
            </div>
          </>
        ) : (
          <div className="rounded-lg border p-4 text-sm text-gray-500">
            아직 표시할 내용이 없습니다. 위 입력창에 JSON을 붙여넣어 주세요.
          </div>
        )}
      </section>
    </div>
  );
}
