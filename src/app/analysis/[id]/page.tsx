import { prisma } from '@/lib/db';
import {getUserIdFromJwtCookie } from '@/server/auth';
import { notFound, redirect } from 'next/navigation';
import type { Prisma as P } from '@prisma/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Axis = {
  id: string;
  name: string;
  score: number;
  weight?: number;
  rationale?: string;
  evidence?: string[];
  recommendations?: string[];
};
type DeepDive = {
  id: string;
  title: string;
  score: number;
  basis?: string;
  overview?: string;
  detail_md?: string;
  next_steps?: string[];
  analysis?: string;
};

type FitV11 = {
  version: 'fit.v1.1';
  locale?: string;
  job_family?: string;
  meta?: Record<string, unknown>;
  job?: { url?: string; title?: string; company?: string };
  resume?: { filename?: string; pages?: number };
  summary_short: string;
  summary_long: string;
  overall: { score: number; grade?: string; verdict?: string };
  axes: Axis[]; // 5
  deep_dives: DeepDive[]; // 4
  strengths?: string[];
  gaps?: string[];
  recommendations?: { priority: string; action: string; impact?: string }[];
  confidence?: { level: number; notes?: string };
};


function toObject(raw: P.JsonValue | null | undefined): unknown {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return { applicant_recruitment: raw };
    }
  }
  return raw;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;
const isString = (v: unknown): v is string => typeof v === 'string';

function normalize(raw: unknown): FitV11 | null {
  if (!isRecord(raw)) return null;

  if (raw.version === 'fit.v1.1') {
    const v = raw as unknown as FitV11;
    if (Array.isArray(v.axes) && Array.isArray(v.deep_dives)) return v;
    return null;
  }



  if (
    'applicant_recruitment' in raw &&
    isString((raw as Record<string, unknown>).applicant_recruitment)
  ) {
    const md = String(
      (raw as Record<string, unknown>).applicant_recruitment
    );
    return {
      version: 'fit.v1.1',
      summary_short: md.slice(0, 450),
      summary_long: md,
      overall: { score: 0 },
      axes: [],
      deep_dives: [],
    };
  }

  return null;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
function RingGauge({ value, size = 148 }: { value: number; size?: number }) {
  const r = (size - 24) / 2;
  const c = 2 * Math.PI * r;
  const pct = clamp01(value / 100);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
      <defs>
        <linearGradient id='gauge' x1='0' y1='0' x2='1' y2='0'>
          <stop offset='0%' stopColor='var(--brand-a)' />
          <stop offset='50%' stopColor='var(--brand-b)' />
          <stop offset='100%' stopColor='var(--brand-d)' />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill='none'
        stroke='currentColor'
        opacity={0.15}
        strokeWidth={12}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill='none'
        stroke='url(#gauge)'
        strokeWidth={12}
        strokeLinecap='round'
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={`${c * (1 - pct)}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2}
        y={size / 2 + 4}
        textAnchor='middle'
        className='text-2xl font-bold'
      >
        {Math.round(value)}
      </text>
    </svg>
  );
}
function Meter({ pct }: { pct: number }) {
  return (
    <div
      className='h-2 w-full rounded-full'
      style={{ background: 'var(--muted)' }}
    >
      <div
        className='h-full rounded-full'
        style={{ width: `${Math.round(pct)}%`, background: 'var(--primary)' }}
      />
    </div>
  );
}
function Radar5({ axes, size = 340 }: { axes: Axis[]; size?: number }) {
  const R = size * 0.38;
  const center = { x: size / 2, y: size / 2 };
  const ringLevels = [1, 0.75, 0.5, 0.25];
  const pts = (axes || []).slice(0, 5).map((a, i) => {
    const ang = ((-90 + i * 72) * Math.PI) / 180;
    const r = clamp01((a?.score ?? 0) / 100) * R;
    return [center.x + r * Math.cos(ang), center.y + r * Math.sin(ang)];
  });
  const poly = pts.map((p) => p.join(',')).join(' ');
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
      {ringLevels.map((t, j) => (
        <polygon
          key={j}
          points={Array.from({ length: 5 }, (_, i) => {
            const ang = ((-90 + i * 72) * Math.PI) / 180;
            const r = R * t;
            const x = center.x + r * Math.cos(ang);
            const y = center.y + r * Math.sin(ang);
            return `${x},${y}`;
          }).join(' ')}
          fill='none'
          stroke='currentColor'
          opacity={0.1}
        />
      ))}
      <defs>
        <linearGradient id='radarFill' x1='0' y1='0' x2='1' y2='0'>
          <stop offset='0%' stopColor='var(--brand-a)' />
          <stop offset='100%' stopColor='var(--brand-c)' />
        </linearGradient>
        <linearGradient id='radarStroke' x1='0' y1='0' x2='1' y2='0'>
          <stop offset='0%' stopColor='var(--brand-b)' />
          <stop offset='100%' stopColor='var(--brand-d)' />
        </linearGradient>
      </defs>
      <polygon
        points={poly}
        fill='url(#radarFill)'
        opacity={0.25}
        stroke='url(#radarStroke)'
        strokeWidth={2}
      />
    </svg>
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const userId = await getUserIdFromJwtCookie();
  if (!userId) redirect(`/login?next=/analysis/${id}`);

  const fit = await prisma.fitResult.findFirst({ where: { id, userId } });
  if (!fit) notFound();

  const obj = normalize(toObject(fit.raw));
  // 안전 가드
  const axes = obj?.axes ?? [];
  const dd = obj?.deep_dives ?? [];

  return (
    <div className='mx-auto max-w-7xl p-6 space-y-6'>
      <header className='space-y-2'>
        <h1 className='text-2xl font-semibold'>
          <span className='text-brand-gradient'>FitReport</span> — 분석 결과
        </h1>
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

      {/* Bento Grid */}
      <div className='grid grid-cols-12 auto-rows-[minmax(120px,_auto)] gap-5'>
        {/* 총점/개요 */}
        <div className='col-span-12 sm:col-span-6 lg:col-span-5 rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm p-4'>
          <div className='mb-3 flex items-start gap-2'>
            <div className='inline-flex items-center justify-center bg-brand-gradient p-[2px] rounded-full'>
              <div
                className='h-8 w-8 rounded-full flex items-center justify-center text-sm'
                style={{
                  background: 'var(--background)',
                  color: 'var(--primary)',
                }}
              >
                🎯
              </div>
            </div>
            <div>
              <h3 className='text-base font-semibold'>
                {obj?.job?.title || '분석 결과'}
              </h3>
              <p className='text-xs text-muted-foreground'>
                {obj?.job?.company}
              </p>
            </div>
          </div>

          <div className='flex items-center gap-5'>
            <RingGauge value={obj?.overall?.score ?? fit.score ?? 0} />
            <div className='space-y-1'>
              <div className='text-sm text-muted-foreground'>
                {obj?.overall?.grade && (
                  <span className='mr-2'>Grade {obj.overall.grade}</span>
                )}
                {obj?.overall?.verdict}
              </div>
              {obj?.resume?.filename && (
                <div className='text-xs text-muted-foreground'>
                  {obj.resume.filename}{' '}
                  {typeof obj.resume.pages === 'number'
                    ? `• ${obj.resume.pages}p`
                    : ''}
                </div>
              )}
            </div>
          </div>

          <div
            className='mt-4 rounded-xl border border-black/5 dark:border-white/10 p-3'
            style={{ background: 'var(--muted)' }}
          >
            <div className='text-xs text-muted-foreground mb-1'>
              요약(≤500자)
            </div>
            <p className='text-sm whitespace-pre-wrap leading-relaxed'>
              {obj?.summary_short || fit.summary || '—'}
            </p>
          </div>
        </div>
        
        {/* 5축 레이더 */}
        <div className='col-span-12 sm:col-span-6 lg:col-span-4 rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm p-4'>
          <div className='mb-3 flex items-start gap-2'>
            <div className='inline-flex items-center justify-center bg-brand-gradient p-[2px] rounded-full'>
              <div
                className='h-8 w-8 rounded-full flex items-center justify-center text-sm'
                style={{
                  background: 'var(--background)',
                  color: 'var(--primary)',
                }}
              >
                📈
              </div>
            </div>
            <div>
              <h3 className='text-base font-semibold'>5축 레이더</h3>
            </div>
          </div>
          <div className='relative flex items-center justify-center'>
            <Radar5 axes={axes} />
            <div className='absolute bottom-3 right-3 text-[11px] md:text-xs px-2 py-1 rounded-full border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/10 backdrop-blur'>
              직무 · 오너십 · 협업 · 실행 · 도메인
            </div>
          </div>
        </div>

        {/* 5축 리스트 */}
        <div className='col-span-12 lg:col-span-3 rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm p-4'>
          <div className='mb-3 flex items-start gap-2'>
            <div className='inline-flex items-center justify-center bg-brand-gradient p-[2px] rounded-full'>
              <div
                className='h-8 w-8 rounded-full flex items-center justify-center text-sm'
                style={{
                  background: 'var(--background)',
                  color: 'var(--primary)',
                }}
              >
                🧭
              </div>
            </div>
            <h3 className='text-base font-semibold'>핵심 5축</h3>
          </div>
          <div className='grid grid-cols-1 gap-3'>
            {axes.map((a) => (
              <div
                key={a.id}
                className='rounded-xl border border-black/5 dark:border-white/10 p-3 bg-white/70 dark:bg-white/5'
              >
                <div className='flex items-center justify-between'>
                  <div className='text-sm text-muted-foreground'>{a.name}</div>
                  <div className='text-sm font-semibold'>{a.score}/100</div>
                </div>
                <div className='mt-2'>
                  <Meter pct={a.score} />
                </div>
                {a.rationale && (
                  <div className='mt-2 text-xs text-muted-foreground'>
                    {a.rationale}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Deep dives 4장 */}
        {dd.map((d) => (
          <div
            key={d.id}
            className='col-span-12 md:col-span-6 rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm p-4'
          >
            <div className='mb-3 flex items-start gap-2'>
              <div className='inline-flex items-center justify-center bg-brand-gradient p-[2px] rounded-full'>
                <div
                  className='h-8 w-8 rounded-full flex items-center justify-center text-sm'
                  style={{
                    background: 'var(--background)',
                    color: 'var(--primary)',
                  }}
                >
                  🪄
                </div>
              </div>
              <div>
                <h3 className='text-base font-semibold'>{d.title}</h3>
                <p className='text-xs text-muted-foreground'>
                  {d.score}/100{d.basis ? ` • ${d.basis}` : ''}
                </p>
              </div>
            </div>

            {(d.overview || d.analysis) && (
              <p className='text-sm whitespace-pre-wrap leading-relaxed'>
                {d.overview ?? d.analysis ?? ''}
              </p>
            )}

            {d.detail_md && (
              <details className='mt-2'>
                <summary className='cursor-pointer text-sm underline'>
                  자세히 보기(≤2000자)
                </summary>
                <article className='prose max-w-none mt-2 text-sm'>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {d.detail_md}
                  </ReactMarkdown>
                </article>
              </details>
            )}

            {d.next_steps && d.next_steps.length > 0 && (
              <div className='mt-2'>
                <div className='text-xs text-muted-foreground mb-1'>
                  Next Steps
                </div>
                <ul className='text-sm list-disc pl-5'>
                  {d.next_steps.map((s, i) => (
                    <li key={`${d.id}-${i}`}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        {/* 추천/강점/갭 */}
        <div className='col-span-12 md:col-span-4 rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm p-4'>
          <div className='mb-3 flex items-start gap-2'>
            <div className='inline-flex items-center justify-center bg-brand-gradient p-[2px] rounded-full'>
              <div
                className='h-8 w-8 rounded-full flex items-center justify-center text-sm'
                style={{
                  background: 'var(--background)',
                  color: 'var(--primary)',
                }}
              >
                🧪
              </div>
            </div>
            <h3 className='text-base font-semibold'>추천 액션</h3>
          </div>
          {obj?.recommendations?.length ? (
            <ul className='text-sm space-y-2'>
              {obj.recommendations.map((r, i) => (
                <li
                  key={i}
                  className='flex items-center justify-between rounded-lg px-3 py-2 border border-black/5 dark:border-white/10'
                >
                  <div className='flex items-center gap-2'>
                    <span
                      className='px-2 py-0.5 rounded-full text-xs text-white'
                      style={{ background: 'var(--primary)' }}
                    >
                      {r.priority}
                    </span>
                    <span>{r.action}</span>
                  </div>
                  {r.impact && (
                    <span
                      className='text-xs px-2 py-0.5 rounded-full'
                      style={{ background: 'var(--muted)' }}
                    >
                      {r.impact}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className='text-sm text-muted-foreground'>—</div>
          )}
        </div>

        <div className='col-span-12 md:col-span-4 rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm p-4'>
          <div className='mb-3 flex items-start gap-2'>
            <div className='inline-flex items-center justify-center bg-brand-gradient p-[2px] rounded-full'>
              <div
                className='h-8 w-8 rounded-full flex items-center justify-center text-sm'
                style={{
                  background: 'var(--background)',
                  color: 'var(--primary)',
                }}
              >
                ✨
              </div>
            </div>
            <h3 className='text-base font-semibold'>강점</h3>
          </div>
          {obj?.strengths?.length ? (
            <ul className='text-sm list-disc pl-5'>
              {obj.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : (
            <div className='text-sm text-muted-foreground'>—</div>
          )}
        </div>

        <div className='col-span-12 md:col-span-4 rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm p-4'>
          <div className='mb-3 flex items-start gap-2'>
            <div className='inline-flex items-center justify-center bg-brand-gradient p-[2px] rounded-full'>
              <div
                className='h-8 w-8 rounded-full flex items-center justify-center text-sm'
                style={{
                  background: 'var(--background)',
                  color: 'var(--primary)',
                }}
              >
                🧩
              </div>
            </div>
            <h3 className='text-base font-semibold'>보완 포인트</h3>
          </div>
          {obj?.gaps?.length ? (
            <ul className='text-sm list-disc pl-5'>
              {obj.gaps.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          ) : (
            <div className='text-sm text-muted-foreground'>—</div>
          )}
        </div>

        {/* 전체 상세 보고서 */}
        <div className='col-span-12 rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm p-4'>
          <div className='mb-3 flex items-start gap-2'>
            <div className='inline-flex items-center justify-center bg-brand-gradient p-[2px] rounded-full'>
              <div
                className='h-8 w-8 rounded-full flex items-center justify-center text-sm'
                style={{
                  background: 'var(--background)',
                  color: 'var(--primary)',
                }}
              >
                📄
              </div>
            </div>
            <h3 className='text-base font-semibold'>
              전체 상세 보고서(≤2000자, MD 허용)
            </h3>
          </div>
          <article className='prose max-w-none text-sm'>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {obj?.summary_long || fit.summary || '—'}
            </ReactMarkdown>
          </article>
        </div>
      </div>
    </div>
  );
}
