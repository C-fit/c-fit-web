// src/app/jobs/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
import { MultiSelectDialog } from '@/components/filters/multi-select-dialog';
import { JOB_OPTIONS } from '@/lib/job-tech-options';

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

const EXP_ALL = 'ALL';

export default function JobsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // --- state
  const [q, setQ] = useState('');
  const [jobs, setJobs] = useState<string[]>([]); // ⬅️ 변경: 배열
  const [company, setCompany] = useState('');
  const [exp, setExp] = useState<string>(''); // "", "신입", "경력무관"
  const [years, setYears] = useState<[number, number]>([0, 20]);
  const [sort, setSort] = useState<'recent' | 'company' | 'title'>('recent');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // URL → state 복원
  useEffect(() => {
    if (!sp) return;
    const get = (k: string) => sp.get(k) ?? '';

    setQ(get('q'));
    setCompany(get('company'));

    const j = get('job');
    setJobs(
      j
        ? j
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : []
    );



    const expQ = get('exp');
    setExp(expQ);

    const minY = Number(sp.get('minYear') ?? '0');
    const maxY = Number(sp.get('maxYear') ?? '20');
    setYears([
      Number.isFinite(minY) ? minY : 0,
      Number.isFinite(maxY) ? maxY : 20,
    ] as [number, number]);

    const s = (get('sort') as any) || 'recent';
    setSort(['recent', 'company', 'title'].includes(s) ? s : 'recent');

    const p = Number(sp.get('page') ?? '1');
    const ps = Number(sp.get('pageSize') ?? '20');
    setPage(Number.isFinite(p) && p > 0 ? p : 1);
    setPageSize(Number.isFinite(ps) ? Math.min(Math.max(ps, 1), 100) : 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 쿼리스트링 생성
  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (jobs.length) p.set('job', jobs.join(','));
    if (company) p.set('company', company);
    if (exp) p.set('exp', exp);
    if (years) {
      p.set('minYear', String(years[0]));
      p.set('maxYear', String(years[1]));
    }
    p.set('sort', sort);
    p.set('page', String(page));
    p.set('pageSize', String(pageSize));
    return p.toString();
  }, [q, jobs, company, exp, years, sort, page, pageSize]);

  // 주소 동기화
  useEffect(() => {
    router.replace(`${pathname}?${queryString}`);
  }, [router, pathname, queryString]);

  // fetch (디바운스 + abort)
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const fetchList = () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/jobs?${queryString}`, {
          cache: 'no-store',
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ApiResp;
        setData(json);
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setErr('목록을 불러오지 못했습니다.');
          console.error(e);
        }
      } finally {
        setLoading(false);
      }
    }, 250);
  };
  useEffect(() => {
    fetchList(); /* eslint-disable-next-line */
  }, [queryString]);

  const totalPages = useMemo(
    () => (data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1),
    [data]
  );

  const handleSavedChange = (id: string, saved: boolean) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((it) =>
              it.id === id ? { ...it, saved } : it
            ),
          }
        : prev
    );
  };

  const clearFilters = () => {
    setQ('');
    setJobs([]);
    setCompany('');
    setExp('');
    setYears([0, 20]);
    setSort('recent');
    setPage(1);
    setPageSize(20);
  };

  return (
    <div className='container mx-auto px-4 py-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>채용공고 검색</h1>
        <Button variant='ghost' onClick={clearFilters}>
          필터 초기화
        </Button>
      </div>

      {/* Filters */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4 items-end'>
        <div className='space-y-1'>
          <Label>검색어</Label>
          <Input
            placeholder='제목/회사/직무/스택…'
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className='space-y-1'>
          <Label>직무</Label>
          <MultiSelectDialog
            triggerLabel='직무'
            options={JOB_OPTIONS}
            value={jobs}
            onChange={(v) => {
              setJobs(v);
              setPage(1);
            }}
            placeholder='직무명을 검색해 주세요.'
          />
        </div>


        <div className='space-y-1'>
          <Label>회사</Label>
          <Input
            placeholder='회사명'
            value={company}
            onChange={(e) => {
              setCompany(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className='space-y-1 md:col-span-2'>
          <Label>경력 구간 (년)</Label>
          <div className='px-2'>
            <Slider
              min={0}
              max={20}
              step={1}
              value={years}
              onValueChange={(v) => {
                setYears([v[0], v[1]] as [number, number]);
                setPage(1);
              }}
            />
          </div>
          <div className='text-sm text-muted-foreground'>
            선택: {years[0]} ~ {years[1]}년
          </div>
        </div>

        <div className='space-y-1'>
          <Label>경력 표기</Label>
          <Select
            value={exp || EXP_ALL}
            onValueChange={(v) => {
              setExp(v === EXP_ALL ? '' : v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder='전체' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EXP_ALL}>전체</SelectItem>
              <SelectItem value='신입'>신입</SelectItem>
              <SelectItem value='경력무관'>경력무관</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-1'>
          <Label>정렬</Label>
          <Select
            value={sort}
            onValueChange={(v: any) => {
              setSort(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder='최신순' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='recent'>최신순</SelectItem>
              <SelectItem value='company'>회사명</SelectItem>
              <SelectItem value='title'>제목</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results header */}
      <div className='flex items-center justify-between'>
        <div className='text-sm text-muted-foreground'>
          {loading ? '불러오는 중…' : data ? `총 ${data.total}건` : ''}
          {err && <span className='text-red-500 ml-2'>{err}</span>}
        </div>
        <div className='flex items-center gap-2'>
          <Label className='text-sm'>페이지당</Label>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className='w-24'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='10'>10</SelectItem>
              <SelectItem value='20'>20</SelectItem>
              <SelectItem value='50'>50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-4'>
        {data?.items.map((it) => (
          <JobCard key={it.id} item={it} onSavedChange={handleSavedChange} />
        ))}
      </div>

      {/* Empty */}
      {!loading && data && data.items.length === 0 && (
        <div className='text-center text-sm text-muted-foreground py-8'>
          조건에 맞는 공고가 없습니다. 필터를 조정해 보세요.
        </div>
      )}

      {/* Paging */}
      <div className='flex items-center justify-center gap-3 pt-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
        >
          이전
        </Button>
        <div className='text-sm'>
          페이지 {page} /{' '}
          {data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1}
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={() =>
            data &&
            page < Math.ceil(data.total / data.pageSize) &&
            setPage((p) => p + 1)
          }
          disabled={
            loading ||
            (data ? page >= Math.ceil(data.total / data.pageSize) : true)
          }
        >
          다음
        </Button>
      </div>
    </div>
  );
}
