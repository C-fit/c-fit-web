'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Axis = {
  id: string;
  name: string;
  score: number; // 0~100
  weight?: number;
  rationale?: string;
  evidence?: string[];
  recommendations?: string[];
};

type DeepDiveV11 = {
  id: string;
  title: string;
  score: number; 
  basis?: string;
  overview?: string; 
  detail_md?: string; 
  next_steps?: string[];
  analysis?: string;
};

type FitReportV11 = {
  version: 'fit.v1.1';
  locale?: string;
  job_family?: string;
  meta?: Record<string, unknown>;
  job?: { url?: string; title?: string; company?: string };
  resume?: { filename?: string; pages?: number };
  summary_short: string;
  summary_long: string;
  overall: { score: number; grade?: string; verdict?: string };
  axes: Axis[]; 
  deep_dives: DeepDiveV11[]; 
  strengths?: string[];
  gaps?: string[];
  recommendations?: { priority: string; action: string; impact?: string }[];
  confidence?: { level: number; notes?: string };
};


type DeepDiveV1 = Omit<DeepDiveV11, 'overview' | 'detail_md'> & {
  analysis?: string;
};
type FitReportV1 = Omit<FitReportV11, 'version' | 'deep_dives'> & {
  version: 'fit.v1';
  deep_dives: DeepDiveV1[];
};


const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

const isString = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number => typeof v === 'number';

function isAxis(v: unknown): v is Axis {
  return isRecord(v) && isString(v.id) && isString(v.name) && isNumber(v.score);
}

function isDeepDiveV11(v: unknown): v is DeepDiveV11 {
  return (
    isRecord(v) && isString(v.id) && isString(v.title) && isNumber(v.score)
  );
}

function isFitReportV11(v: unknown): v is FitReportV11 {
  return (
    isRecord(v) &&
    v.version === 'fit.v1.1' &&
    Array.isArray(v.axes) &&
    v.axes.every(isAxis) &&
    Array.isArray(v.deep_dives) &&
    v.deep_dives.every(isDeepDiveV11) &&
    isRecord(v.overall) &&
    isNumber((v.overall as { score?: unknown }).score) 
  );
}

function isDeepDiveV1(v: unknown): v is DeepDiveV1 {
  return (
    isRecord(v) && isString(v.id) && isString(v.title) && isNumber(v.score)
  );
}

function isFitReportV1(v: unknown): v is FitReportV1 {
  return (
    isRecord(v) &&
    v.version === 'fit.v1' &&
    Array.isArray(v.axes) &&
    v.axes.every(isAxis) &&
    Array.isArray(v.deep_dives) &&
    v.deep_dives.every(isDeepDiveV1) &&
    isRecord(v.overall) &&
    isNumber((v.overall as { score?: unknown }).score)
  );
}

function parseAndNormalize(input: string): FitReportV11 | null {
  const raw: unknown = JSON.parse(input);

  if (isFitReportV11(raw)) {
    return raw;
  }

  if (isFitReportV1(raw)) {
    const deep_dives: DeepDiveV11[] = raw.deep_dives.map((d) => ({
      id: d.id,
      title: d.title,
      score: d.score,
      basis: isString(d.basis) ? d.basis : undefined,
      overview:
        isRecord(d) && isString((d as Record<string, unknown>).overview)
          ? ((d as Record<string, unknown>).overview as string)
          : isString(d.analysis)
          ? d.analysis
          : '',
      detail_md:
        isRecord(d) && isString((d as Record<string, unknown>).detail_md)
          ? ((d as Record<string, unknown>).detail_md as string)
          : '',
      next_steps: Array.isArray(d.next_steps)
        ? d.next_steps.filter(isString)
        : [],
    }));

    const ov = raw.overall as {score: number; grade?: unknown; verdict?: unknown};

    const norm: FitReportV11 = {
      version: 'fit.v1.1',
      locale: isString(raw.locale) ? raw.locale : undefined,
      job_family: isString(raw.job_family) ? raw.job_family : undefined,
      meta: isRecord(raw.meta) ? raw.meta : undefined,
      job: isRecord(raw.job) ? (raw.job as FitReportV11['job']) : undefined,
      resume: isRecord(raw.resume)
        ? (raw.resume as FitReportV11['resume'])
        : undefined,
      summary_short: isString(raw.summary_short) ? raw.summary_short : '',
      summary_long: isString(raw.summary_long) ? raw.summary_long : '',
      overall: {
        score: ov.score,
        grade: typeof ov.grade === 'string' ? ov.grade : undefined,
        verdict: typeof ov.verdict === 'string' ? ov.verdict : undefined,
      },
      axes: raw.axes,
      deep_dives,
      strengths: Array.isArray(raw.strengths)
        ? raw.strengths.filter(isString)
        : undefined,
      gaps: Array.isArray(raw.gaps) ? raw.gaps.filter(isString) : undefined,
      recommendations: Array.isArray(raw.recommendations)
         ? raw.recommendations
            .filter(isRecord)
            .map((r: Record<string, unknown>) => ({
              priority: isString(r.priority) ? r.priority : 'P3',
              action: isString(r.action) ? r.action : '',
              impact: isString(r.impact) ? r.impact : undefined,
            }))
        : undefined,
      confidence: isRecord(raw.confidence)
        ? (raw.confidence as FitReportV11['confidence'])
        : undefined,
    };
    return norm;
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
        className='h-full rounded-full transition-all'
        style={{ width: `${Math.round(pct)}%`, background: 'var(--primary)' }}
      />
    </div>
  );
}

function Radar5({ axes, size = 340 }: { axes: Axis[]; size?: number }) {
  const R = size * 0.38;
  const center = { x: size / 2, y: size / 2 };
  const ringLevels = [1, 0.75, 0.5, 0.25];

  const pts = axes.slice(0, 5).map((a, i) => {
    const angle = (-90 + i * 72) * (Math.PI / 180);
    const r = clamp01((a?.score ?? 0) / 100) * R;
    return [center.x + r * Math.cos(angle), center.y + r * Math.sin(angle)];
  });
  const poly = pts.map((p) => p.join(',')).join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
      {ringLevels.map((t, j) => (
        <polygon
          key={j}
          points={Array.from({ length: 5 }, (_, i) => {
            const ang = (-90 + i * 72) * (Math.PI / 180);
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

/* =========================
   Bento card & Modal
========================= */
function BentoCard(props: {
  icon?: string;
  title?: string;
  subtitle?: string;
  href?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { icon, title, subtitle, href, children, className = '' } = props;

  // 공통 클래스
  const cls = [
    'group relative rounded-2xl border border-black/5 dark:border-white/10',
    'bg-white/80 dark:bg-white/5 backdrop-blur-sm shadow-sm hover:shadow-md',
    'transition-all hover:-translate-y-[1px] p-4',
    className,
  ].join(' ');

  const Header = (
    <>
      {(icon || title || subtitle) && (
        <div className='mb-3 flex items-start gap-2'>
          {icon && (
            <div className='inline-flex items-center justify-center bg-brand-gradient p-[2px] rounded-full'>
              <div
                className='h-8 w-8 rounded-full flex items-center justify-center text-sm'
                style={{
                  background: 'var(--background)',
                  color: 'var(--primary)',
                }}
              >
                {icon}
              </div>
            </div>
          )}
          <div>
            {title && <h3 className='text-base font-semibold'>{title}</h3>}
            {subtitle && (
              <p className='text-xs text-muted-foreground'>{subtitle}</p>
            )}
          </div>
        </div>
      )}
    </>
  );

  // ✅ 분기 렌더링: JSX 네임스페이스 사용 안 함
  if (href) {
    return (
      <a
        href={href}
        target='_blank'
        rel='noreferrer'
        className={cls}
        style={{ color: 'var(--foreground)' }}
      >
        {Header}
        {children}
        <div className='pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-transparent group-hover:ring-black/5 dark:group-hover:ring-white/10' />
      </a>
    );
  }

  return (
    <div className={cls} style={{ color: 'var(--foreground)' }}>
      {Header}
      {children}
      <div className='pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-transparent group-hover:ring-black/5 dark:group-hover:ring-white/10' />
    </div>
  );
}

function Modal(props: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  const { open, onClose, children, title } = props;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className='fixed inset-0 z-50'>
      <div className='absolute inset-0 bg-black/40' onClick={onClose} />
      <div
        ref={ref}
        className='absolute left-1/2 top-1/2 w-[min(100%,900px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-black/10 bg-white p-4 shadow-xl dark:bg-zinc-900'
      >
        <div className='mb-3 flex items-center justify-between'>
          <div className='text-base font-semibold'>{title}</div>
          <button
            onClick={onClose}
            className='rounded-full px-3 py-1 text-sm'
            style={{ background: 'var(--muted)' }}
          >
            닫기
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* =========================
   Page
========================= */
export default function DemoBentoDetachedInput() {
  const [raw, setRaw] = useState<string>(''); // JSON 텍스트
  const [editorOpen, setEditorOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setEditorOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const data: FitReportV11 | null = useMemo(() => {
    setErr(null);
    const text = raw.trim();
    if (!text) return null;
    try {
      const norm = parseAndNormalize(text);
      if (!norm)
        throw new Error('지원하지 않는 스키마입니다. (fit.v1 또는 fit.v1.1)');
      if (norm.axes.length !== 5) throw new Error('axes는 5개여야 합니다.');
      if (norm.deep_dives.length !== 4)
        throw new Error('deep_dives는 4개여야 합니다.');
      return norm;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [raw]);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    setRaw(text);
  }

  return (
    <div className='mx-auto max-w-7xl p-6 space-y-6'>
      <header className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>
          <span className='text-brand-gradient'>FitReport</span> 데모 — Bento
        </h1>
        <div className='flex items-center gap-2'>
          {err && (
            <span className='text-sm text-red-600'>파싱 오류: {err}</span>
          )}
          <button
            onClick={() => setEditorOpen(true)}
            className='rounded-full px-3 py-1 text-sm text-white'
            style={{ background: 'var(--primary)' }}
            title='Ctrl/⌘+K'
          >
            데이터 붙여넣기
          </button>
        </div>
      </header>

      <div className='grid grid-cols-12 auto-rows-[minmax(120px,_auto)] gap-5'>
        <BentoCard
          icon='🎯'
          title={data?.job?.title || '분석 결과'}
          subtitle={data?.job?.company}
          href={data?.job?.url}
          className='col-span-12 sm:col-span-6 lg:col-span-5 overflow-hidden'
        >
          <div className='flex items-center gap-5'>
            <RingGauge value={data?.overall?.score ?? 0} />
            <div className='space-y-1'>
              <div className='text-sm text-muted-foreground'>
                {data?.overall?.grade && (
                  <span className='mr-2'>Grade {data.overall.grade}</span>
                )}
                {data?.overall?.verdict}
              </div>
              {data?.resume?.filename && (
                <div className='text-xs text-muted-foreground'>
                  {data.resume.filename}{' '}
                  {typeof data.resume.pages === 'number'
                    ? `• ${data.resume.pages}p`
                    : ''}
                </div>
              )}
              {data?.job?.url && (
                <a
                  className='text-xs underline break-all'
                  href={data.job.url}
                  target='_blank'
                  rel='noreferrer'
                >
                  {data.job.url}
                </a>
              )}
            </div>
          </div>

          <div
            className='mt-4 rounded-xl border border-black/5 dark:border-white/10 p-3'
            style={{ background: 'var(--muted)' }}
          >
            <div className='text-xs text-muted-foreground mb-1'>
              요약
            </div>
            <p className='text-sm whitespace-pre-wrap leading-relaxed'>
              {data?.summary_short || '데이터 입력 후 요약이 표시됩니다.'}
            </p>
          </div>
        </BentoCard>

        <BentoCard
          icon='📈'
          title='5축 레이더'
          className='col-span-12 sm:col-span-6 lg:col-span-4'
        >
          {data ? (
            <div className='relative flex items-center justify-center'>
              <Radar5 axes={data.axes} size={340} />
              {/* ⬇️ 그래프에 붙는 캡션 */}
              <div
                className='absolute bottom-3 right-3 text-[11px] md:text-xs px-2 py-1 rounded-full
                   border border-black/5 dark:border-white/10
                   bg-white/70 dark:bg-white/10 backdrop-blur'
              >
                직무 · 오너십 · 협업 · 실행 · 도메인
              </div>
            </div>
          ) : (
            <div className='text-sm text-muted-foreground'>데이터 없음</div>
          )}
        </BentoCard>

        <BentoCard
          icon='🧭'
          title='핵심 5축'
          className='col-span-12 lg:col-span-3'
        >
          {data ? (
            <div className='grid grid-cols-1 gap-3'>
              {data.axes.map((a) => (
                <div
                  key={a.id}
                  className='rounded-xl border border-black/5 dark:border-white/10 p-3 bg-white/70 dark:bg-white/5'
                >
                  <div className='flex items-center justify-between'>
                    <div className='text-sm text-muted-foreground'>
                      {a.name}
                    </div>
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
          ) : (
            <div className='text-sm text-muted-foreground'>데이터 없음</div>
          )}
        </BentoCard>

        {data?.deep_dives?.map((d) => (
          <BentoCard
            key={d.id}
            icon='🪄'
            title={d.title}
            subtitle={`${d.score}/100${d.basis ? ` • ${d.basis}` : ''}`}
            className='col-span-12 md:col-span-6'
          >
            {(d.overview || d.analysis) && (
              <p className='text-sm whitespace-pre-wrap leading-relaxed'>
                {d.overview ?? d.analysis ?? ''}
              </p>
            )}
            {d.detail_md && (
              <details className='mt-2'>
                <summary className='cursor-pointer text-sm underline'>
                  자세히 보기
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
                  {d.next_steps.map((s, j) => (
                    <li key={`${d.id}-${j}`}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </BentoCard>
        ))}

        <BentoCard
          icon='🧪'
          title='추천 액션'
          className='col-span-12 md:col-span-4'
        >
          {data?.recommendations?.length ? (
            <ul className='text-sm space-y-2'>
              {data.recommendations.map((r, i) => (
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
        </BentoCard>

        <BentoCard icon='✨' title='강점' className='col-span-12 md:col-span-4'>
          {data?.strengths?.length ? (
            <ul className='text-sm list-disc pl-5'>
              {data.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : (
            <div className='text-sm text-muted-foreground'>—</div>
          )}
        </BentoCard>

        <BentoCard
          icon='🧩'
          title='보완 포인트'
          className='col-span-12 md:col-span-4'
        >
          {data?.gaps?.length ? (
            <ul className='text-sm list-disc pl-5'>
              {data.gaps.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          ) : (
            <div className='text-sm text-muted-foreground'>—</div>
          )}
        </BentoCard>

        <BentoCard
          icon='📄'
          title='전체 상세 보고서'
          className='col-span-12'
        >
          <article className='prose max-w-none text-sm'>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {data?.summary_long || '—'}
            </ReactMarkdown>
          </article>
        </BentoCard>
      </div>

      {/* JSON 입력 모달 */}
      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title='FitReport JSON 입력 (Ctrl/⌘+K)'
      >
        <div className='flex items-center justify-between gap-2 mb-2'>
          <input
            type='file'
            accept='application/json'
            onChange={onPickFile}
            className='text-sm'
          />
          <div className='text-xs text-muted-foreground'>
            붙여넣기 후 저장을 눌러 반영
          </div>
        </div>
        <textarea
          className='w-full h-[420px] rounded-xl border border-black/10 p-3 font-mono text-xs outline-none focus:ring-2'
          style={{ background: 'var(--background)' }}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder='여기에 FitReport JSON을 붙여넣으세요 (fit.v1 또는 fit.v1.1 지원)'
          spellCheck={false}
        />
        <div className='mt-3 flex items-center justify-end gap-2'>
          <button
            onClick={() => setRaw('')}
            className='rounded-full px-3 py-1 text-sm'
            style={{ background: 'var(--muted)' }}
          >
            초기화
          </button>
          <button
            onClick={() => setEditorOpen(false)}
            className='rounded-full px-3 py-1 text-sm text-white'
            style={{ background: 'var(--primary)' }}
          >
            저장
          </button>
        </div>
      </Modal>
    </div>
  );
}
