// src/app/analysis/[id]/page.tsx
import { prisma } from '@/lib/db';
import { getOrCreateUserIdFromCookie } from '@/server/auth';
import { notFound, redirect } from 'next/navigation';
import type { Prisma } from '@prisma/client';

type JsonValue = Prisma.JsonValue;
type ScoreItem = { name: string; score: number; total: number; pct: number };

function jsonToRecord(
  raw: JsonValue | null | undefined
): Record<string, unknown> | null {
  if (raw == null) return null;

  if (typeof raw === 'string') {
    try {
      const obj = JSON.parse(raw);
      return obj && typeof obj === 'object' && !Array.isArray(obj)
        ? (obj as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return null;
}

function jsonToString(raw: JsonValue | null | undefined): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw;
  try {
    return JSON.stringify(raw, null, 2);
  } catch {
    return String(raw);
  }
}

function extractOverallScores(md: string): ScoreItem[] {
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
    <div className='h-2 w-full rounded-full bg-muted/60 overflow-hidden'>
      <div className='h-full bg-foreground/80' style={{ width: w }} />
    </div>
  );
}

// ✅ Next 15 규칙에 맞춘 시그니처: params는 Promise여야 함
export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const userId = await getOrCreateUserIdFromCookie();
  if (!userId) redirect(`/login?next=/analysis/${id}`);

  const fit = await prisma.fitResult.findFirst({
    where: { id, userId },
  });
  if (!fit) notFound();

  const rawObj = jsonToRecord(fit.raw);
 
  const md =
    rawObj && typeof rawObj['applicant_recruitment'] === 'string'
      ? (rawObj['applicant_recruitment'] as string)
      : null;

  const scores = md ? extractOverallScores(md) : [];

  return (
    <div className='mx-auto max-w-4xl p-6 space-y-8'>
      <header className='space-y-2'>
        <h1 className='text-2xl font-semibold'>FIT 분석 결과</h1>
        {fit.jobUrl && (
          <div className='text-sm'>
            <span className='text-muted-foreground mr-2'>공고 URL</span>
            <a
              className='underline break-all'
              href={fit.jobUrl}
              target='_blank'
              rel='noreferrer'
            >
              {fit.jobUrl}
            </a>
          </div>
        )}
      </header>

      {/* 핵심 점수 카드 */}
      {scores.length > 0 && (
        <section className='grid gap-4 sm:grid-cols-2'>
          {scores.map((s) => (
            <div key={s.name} className='rounded-lg border p-4'>
              <div className='mb-1 text-sm text-muted-foreground'>{s.name}</div>
              <div className='flex items-baseline justify-between'>
                <div className='text-xl font-bold'>
                  {s.score}/{s.total}
                </div>
                <div className='text-sm text-muted-foreground'>
                  {s.pct.toFixed(0)}%
                </div>
              </div>
              <div className='mt-2'>
                <Meter pct={s.pct} />
              </div>
            </div>
          ))}
        </section>
      )}

      {/* DB 컬럼 기반 요약 섹션(있을 때만) */}
      {(fit.summary ||
        (fit.strengths?.length ?? 0) > 0 ||
        (fit.gaps?.length ?? 0) > 0 ||
        (fit.recommendations?.length ?? 0) > 0) && (
        <section className='grid gap-4'>
          {fit.summary && (
            <div className='rounded-lg border p-4'>
              <div className='text-sm text-muted-foreground mb-2'>요약</div>
              <p className='whitespace-pre-wrap leading-relaxed'>
                {fit.summary}
              </p>
            </div>
          )}
          {fit.strengths && fit.strengths.length > 0 && (
            <div className='rounded-lg border p-4'>
              <div className='text-sm text-muted-foreground mb-2'>강점</div>
              <ul className='list-disc pl-5 space-y-1'>
                {fit.strengths.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          )}
          {fit.gaps && fit.gaps.length > 0 && (
            <div className='rounded-lg border p-4'>
              <div className='text-sm text-muted-foreground mb-2'>
                부족/개선 포인트
              </div>
              <ul className='list-disc pl-5 space-y-1'>
                {fit.gaps.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          )}
          {fit.recommendations && fit.recommendations.length > 0 && (
            <div className='rounded-lg border p-4'>
              <div className='text-sm text-muted-foreground mb-2'>
                추천 액션
              </div>
              <ul className='list-disc pl-5 space-y-1'>
                {fit.recommendations.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* 마크다운 또는 원문 출력 */}
      {md ? (
        <section className='rounded-lg border p-4'>
          <div className='text-sm text-muted-foreground'>보고서(마크다운)</div>
          <article className='prose max-w-none mt-2'>
            <pre className='whitespace-pre-wrap break-words leading-relaxed text-sm'>
              {md}
            </pre>
          </article>
        </section>
      ) : (
        <section className='rounded-lg border p-4'>
          <div className='text-sm text-muted-foreground'>원문(raw)</div>
          <pre className='mt-2 whitespace-pre-wrap break-words text-sm'>
            {jsonToString(fit.raw)}
          </pre>
          <p className='mt-2 text-xs text-muted-foreground'>
            응답에서 <code>applicant_recruitment</code> 마크다운을 찾지 못해
            원문을 그대로 표시했습니다.
          </p>
        </section>
      )}
    </div>
  );
}
