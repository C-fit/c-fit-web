'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Navigation } from '@/components/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { JobCard } from '@/components/jobs/job-card';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { X, ChevronDown } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

type ApiItem = {
  id: string;
  url: string;
  companyName?: string | null;
  title: string;
  jobName?: string | null;
  experienceLevel?: string | null;
  careerYears: number[];
  location?: string | null;
  deadline?: string | null;
  saved?: boolean;
};

type ApiResp = {
  items: ApiItem[];
  total: number;
  page: number;
  pageSize: number;
};

type Sort = 'recent' | 'company' | 'title';

type UrlQuery = {
  q?: string;
  job?: string;
  company?: string;
  minYear?: string;
  maxYear?: string;
  sort: Sort;
  page: string;
  pageSize: string;
};

const JOB_CATEGORIES = [
  '소프트웨어 엔지니어',
  '웹 개발자',
  '서버 개발자',
  '프론트엔드 개발자',
  '자바 개발자',
  'C,C++ 개발자',
  '파이썬 개발자',
  '머신러닝 엔지니어',
  'DevOps / 시스템 관리자',
  '시스템,네트워크 관리자',
  '데이터 엔지니어',
  'Node.js 개발자',
  '안드로이드 개발자',
  'iOS 개발자',
  '임베디드 개발자',
  '개발 매니저',
  '데이터 사이언티스트',
  '기술지원',
  'QA,테스트 엔지니어',
  '하드웨어 엔지니어',
  '빅데이터 엔지니어',
  '보안 엔지니어',
  '프로덕트 매니저',
  '크로스플랫폼 앱 개발자',
  '블록체인 플랫폼 엔지니어',
  'DBA',
  'PHP 개발자',
  '.NET 개발자',
  '영상,음성 엔지니어',
  'ERP전문가',
  '웹 퍼블리셔',
  '그래픽스 엔지니어',
  'CTO,Chief Technology Officer',
  'VR 엔지니어',
  'BI 엔지니어',
  '루비온레일즈 개발자',
  'CIO,Chief Information Officer',
];

function clampInt(
  v: string | undefined,
  min: number,
  max: number,
  fallback: number
) {
  const n = Number.parseInt(v ?? '', 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeSort(v: string | undefined): Sort {
  if (v === 'company' || v === 'title' || v === 'recent') return v;
  return 'recent';
}

function JobsPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const spString = searchParams.toString();

  const query = useMemo(() => {
    const sp = new URLSearchParams(spString);
    const get = (k: string) => sp.get(k) ?? undefined;

    return {
      q: get('q'),
      job: get('job'),
      company: get('company'),
      minYear: get('minYear'),
      maxYear: get('maxYear'),
      sort: normalizeSort(get('sort')),
      page: get('page') ?? '1',
      pageSize: get('pageSize') ?? '20',
    } satisfies UrlQuery;
  }, [spString]);

  const page = clampInt(query.page, 1, 9999, 1);
  const pageSize = clampInt(query.pageSize, 10, 50, 20);
  const sort = query.sort;

  const setQuery = useCallback(
    (
      next: Partial<UrlQuery>,
      opts?: { resetPage?: boolean; replace?: boolean }
    ) => {
      const params = new URLSearchParams(spString);

      if (opts?.resetPage) params.set('page', '1');

      Object.entries(next).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') params.delete(k);
        else params.set(k, String(v));
      });

      const qs = params.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;

      const replace = opts?.replace ?? true;
      if (replace) router.replace(url);
      else router.push(url);
    },
    [router, pathname, spString]
  );

  // ---- UI state (URL과 동기화) ----
  const [qInput, setQInput] = useState('');
  const [companyInput, setCompanyInput] = useState('');

  const [job, setJob] = useState<string[]>([]);
  const [jobOpen, setJobOpen] = useState(false);
  const [jobQuery, setJobQuery] = useState('');

  const [years, setYears] = useState<[number, number]>([0, 20]);

  // URL -> UI state
  useEffect(() => {
    setQInput(query.q ?? '');
    setCompanyInput(query.company ?? '');

    const jobArr = query.job
      ? query.job
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    setJob(jobArr);

    const minY = clampInt(query.minYear, 0, 20, 0);
    const maxY = clampInt(query.maxYear, 0, 20, 20);
    const a = Math.min(minY, maxY);
    const b = Math.max(minY, maxY);
    setYears([a, b]);
  }, [query.q, query.company, query.job, query.minYear, query.maxYear]);

  // 검색어 디바운스 -> URL 반영
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery({ q: qInput || undefined }, { resetPage: true, replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [qInput, setQuery]);

  // 회사 디바운스 -> URL 반영
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(
        { company: companyInput || undefined },
        { resetPage: true, replace: true }
      );
    }, 300);
    return () => clearTimeout(t);
  }, [companyInput, setQuery]);

  // 경력 슬라이더 디바운스 -> URL 반영
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(
        { minYear: String(years[0]), maxYear: String(years[1]) },
        { resetPage: true, replace: true }
      );
    }, 300);
    return () => clearTimeout(t);
  }, [years, setQuery]);

  // ---- Fetch (URL 기반) ----
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(false);

  const apiParams = useMemo(() => {
    const p = new URLSearchParams();

    if (query.q) p.set('q', query.q);
    if (query.job) p.set('job', query.job);
    if (query.company) p.set('company', query.company);

    if (query.minYear) p.set('minYear', query.minYear);
    if (query.maxYear) p.set('maxYear', query.maxYear);

    p.set('sort', sort);
    p.set('page', String(page));
    p.set('pageSize', String(pageSize));
    return p.toString();
  }, [
    query.q,
    query.job,
    query.company,
    query.minYear,
    query.maxYear,
    sort,
    page,
    pageSize,
  ]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs?${apiParams}`, { cache: 'no-store' });
      const json = (await res.json()) as ApiResp;
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [apiParams]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;

  function clearFilters() {
    router.replace(pathname);
    setJobOpen(false);
    setJobQuery('');
    setQInput('');
    setCompanyInput('');
    setJob([]);
    setYears([0, 20]);
  }

  return (
    <main className='container mx-auto px-4 py-6 space-y-6'>
      {/* 헤더: 제목 + 초기화 */}
      <div className='flex items-center justify-between gap-2 flex-wrap w-full'>
        <h1 className='text-2xl font-semibold min-w-0'>채용공고 검색</h1>

        <div className='flex items-center gap-2 shrink-0'>
          <Button
            variant='outline'
            className='h-9 whitespace-nowrap'
            onClick={clearFilters}
            type='button'
          >
            필터 초기화
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4 items-end mt-2'>
        {/* 검색어 */}
        <div className='space-y-1'>
          <Label>검색어</Label>
          <Input
            placeholder='제목/회사/직무…'
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
          />
        </div>

        {/* 직무 선택 (모달) */}
        <div className='space-y-1 md:col-span-2'>
          <Label>직무 선택</Label>

          <Dialog open={jobOpen} onOpenChange={setJobOpen}>
            <DialogTrigger asChild>
              <Button
                variant='outline'
                role='combobox'
                className={`
                  w-full justify-between font-normal
                  ${job.length === 0 ? 'text-muted-foreground' : ''}
                `}
                type='button'
              >
                {job.length === 0 ? '직무 선택' : `${job.join(', ')}`}
                <ChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
              </Button>
            </DialogTrigger>

            <DialogContent className='sm:max-w-[680px]'>
              <DialogHeader>
                <DialogTitle>직무 선택</DialogTitle>
              </DialogHeader>

              <Input
                placeholder='보유 직무를 검색하세요.'
                value={jobQuery}
                onChange={(e) => setJobQuery(e.target.value)}
                className='mt-2'
              />

              <div className='mt-3 flex flex-wrap gap-2'>
                {JOB_CATEGORIES.filter((v) =>
                  jobQuery.trim()
                    ? v.toLowerCase().includes(jobQuery.toLowerCase())
                    : true
                ).map((cat) => {
                  const active = job.includes(cat);
                  return (
                    <Button
                      key={cat}
                      type='button'
                      variant={active ? 'default' : 'outline'}
                      className='h-9 rounded-full'
                      onClick={() =>
                        setJob((prev) =>
                          prev.includes(cat)
                            ? prev.filter((x) => x !== cat)
                            : [...prev, cat]
                        )
                      }
                    >
                      {cat}
                    </Button>
                  );
                })}
              </div>

              {job.length > 0 && (
                <div className='mt-3 flex flex-wrap gap-2'>
                  {job.map((j) => (
                    <Button
                      key={j}
                      type='button'
                      variant='secondary'
                      className='h-8 rounded-full pr-2'
                      onClick={() =>
                        setJob((prev) => prev.filter((x) => x !== j))
                      }
                    >
                      <span className='mr-1'>{j}</span>
                      <X className='size-4' />
                    </Button>
                  ))}
                </div>
              )}

              <DialogFooter className='mt-4'>
                <Button
                  variant='ghost'
                  type='button'
                  onClick={() => {
                    setJob([]);
                    setJobQuery('');
                  }}
                >
                  초기화
                </Button>

                <Button
                  type='button'
                  onClick={() => {
                    const jobStr = job.length ? job.join(',') : undefined;
                    setQuery(
                      { job: jobStr },
                      { resetPage: true, replace: false }
                    );
                    setJobOpen(false);
                  }}
                >
                  적용
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* 회사명 */}
        <div className='space-y-1'>
          <Label>회사</Label>
          <Input
            placeholder='회사명'
            value={companyInput}
            onChange={(e) => setCompanyInput(e.target.value)}
          />
        </div>

        {/* 정렬 */}
        <div className='space-y-1'>
          <Label>정렬</Label>
          <Select
            value={sort}
            onValueChange={(v: Sort) => {
              setQuery({ sort: v }, { resetPage: true, replace: true });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder='정렬' />
            </SelectTrigger>
            <SelectContent
              position='popper'
              className='z-[70] bg-white dark:bg-neutral-900 border shadow-md'
            >
              <SelectItem value='recent'>최신순</SelectItem>
              <SelectItem value='company'>회사명</SelectItem>
              <SelectItem value='title'>제목</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 경력 구간 */}
        <div className='space-y-1 md:col-span-2'>
          <Label>경력 구간 (년)</Label>
          <div className='px-2'>
            <Slider
              min={0}
              max={20}
              step={1}
              value={years}
              onValueChange={(v) => setYears([v[0], v[1]] as [number, number])}
            />
          </div>

          <div className='text-sm text-muted-foreground'>
            선택: {years[0]} ~ {years[1]}년
          </div>
        </div>

        {/* 우상단: 총 건수 / 페이지당 */}
        <div className='space-y-1 md:col-span-1 md:justify-self-end flex items-end justify-between gap-3'>
          <div className='text-sm text-muted-foreground'>
            {loading ? '불러오는 중…' : data ? `총 ${data.total}건` : ''}
          </div>

          <div className='flex items-center gap-2'>
            <Label className='text-sm'>페이지당</Label>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setQuery({ pageSize: v }, { resetPage: true, replace: true });
              }}
            >
              <SelectTrigger className='w-24'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                position='popper'
                className='z-[70] bg-white dark:bg-neutral-900 border shadow-md'
              >
                <SelectItem value='10'>10</SelectItem>
                <SelectItem value='20'>20</SelectItem>
                <SelectItem value='50'>50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 채용공고 목록 */}
      <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-4'>
        {data?.items.map((it) => (
          <JobCard key={it.id} item={it} />
        ))}
      </div>

      {/* 페이지네이션 */}
      <div className='flex items-center justify-center gap-3 pt-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={() =>
            setQuery(
              { page: String(Math.max(1, page - 1)) },
              { replace: false }
            )
          }
          disabled={page <= 1 || loading}
        >
          이전
        </Button>

        <div className='text-sm'>
          페이지 {page} / {totalPages}
        </div>

        <Button
          variant='outline'
          size='sm'
          onClick={() => {
            if (page < totalPages)
              setQuery({ page: String(page + 1) }, { replace: false });
          }}
          disabled={loading || page >= totalPages}
        >
          다음
        </Button>
      </div>
    </main>
  );
}

export default function JobsPage() {
  return (
    <>
      <Navigation />
      <Suspense
        fallback={
          <main className='container mx-auto px-4 py-6 text-sm text-muted-foreground'>
            불러오는 중…
          </main>
        }
      >
        <JobsPageInner />
      </Suspense>
    </>
  );
}
