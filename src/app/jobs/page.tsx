'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
// 상단 import들 근처에 추가
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { X } from 'lucide-react'; // 선택 뱃지의 X 아이콘(선택 해제용)

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

export default function JobsPage() {
  const router = useRouter();

  // 필터 상태
  const [q, setQ] = useState('');
  const [job, setJob] = useState<string[]>([]);
  const [jobOpen, setJobOpen] = useState(false);
  const [jobQuery, setJobQuery] = useState('');
  const [company, setCompany] = useState('');
  const [exp, setExp] = useState<'all' | '신입' | '경력무관'>('all'); // ← 빈 문자열 대신 'all' 사용
  const [years, setYears] = useState<[number, number]>([0, 20]);
  const [sort, setSort] = useState<'recent' | 'company' | 'title'>('recent');
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

  // 페이지네이션
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 데이터
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(false);

  // 쿼리스트링 구성
  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (job.length > 0) p.set('job', job.join(','));
    if (company) p.set('company', company);
    if (exp !== 'all') p.set('exp', exp);

    if (years) {
      p.set('minYear', String(years[0]));
      p.set('maxYear', String(years[1]));
    }
    p.set('sort', sort);
    p.set('page', String(page));
    p.set('pageSize', String(pageSize));
    return p.toString();
  }, [q, job, company, exp, years, sort, page, pageSize]);

  async function fetchList() {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs?${params}`, { cache: 'no-store' });
      const json = (await res.json()) as ApiResp;
      setData(json);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // 필터 초기화
  function clearFilters() {
    setQ('');
    setJob([]);
    setCompany('');
    setExp('all');
    setYears([0, 20]);
    setSort('recent');
    setPage(1);
    setPageSize(20);
  }

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;

  return (
    <>
      <Navigation />
      <main className='container mx-auto px-4 py-6 space-y-6'>
        {/* 헤더: 제목 + 대시보드 / 초기화 */}
        <div className='flex items-center justify-between gap-2 flex-wrap w-full'>
          <h1 className='text-2xl font-semibold min-w-0'>채용공고 검색</h1>
          <div className='flex items-center gap-2 shrink-0'>
            <Button
              variant='ghost'
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
          <div className='space-y-1'>
            <Label>검색어</Label>
            <Input
              placeholder='제목/회사/직무…'
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* 직무 선택 (모달) */}
          <div className='space-y-1 md:col-span-2'>
            <Label>직무 선택</Label>

            <Dialog open={jobOpen} onOpenChange={setJobOpen}>
              <DialogTrigger asChild>
                <Button variant='outline' className='rounded-full'>
                  {job.length === 0 ? '직무 선택' : `선택됨 ${job.length}개`}
                </Button>
              </DialogTrigger>

              <DialogContent className='sm:max-w-[680px]'>
                <DialogHeader>
                  <DialogTitle>직무 선택</DialogTitle>
                </DialogHeader>

                {/* 검색창 (선택사항) */}
                <Input
                  placeholder='보유 직무를 검색하세요.'
                  value={jobQuery}
                  onChange={(e) => setJobQuery(e.target.value)}
                  className='mt-2'
                />

                {/* 태그(버튼) 목록 */}
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

                {/* 선택 결과 뱃지(선택사항) */}
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
                    onClick={() => {
                      setJob([]);
                      setJobQuery('');
                      setPage(1);
                    }}
                  >
                    초기화
                  </Button>
                  <Button
                    onClick={() => {
                      setPage(1);
                      setJobOpen(false); // 적용 후 닫기
                    }}
                  >
                    적용
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* 요약 라벨(선택사항) */}
            {job.length > 0 && (
              <div className='text-sm text-muted-foreground'>
                선택됨: {job.join(', ')}
              </div>
            )}
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

          <div className='space-y-1'>
            <Label>정렬</Label>
            <Select
              value={sort}
              onValueChange={(v: 'recent' | 'company' | 'title') => {
                setSort(v);
                setPage(1);
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
              value={exp}
              onValueChange={(v: 'all' | '신입' | '경력무관') => {
                setExp(v);

                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder='전체' />
              </SelectTrigger>
              <SelectContent
                position='popper'
                className='z-[70] bg-white dark:bg-neutral-900 border shadow-md'
              >
                {/* ⛔️ 빈 문자열 금지: 'all'을 사용 */}
                <SelectItem value='all'>전체</SelectItem>
                <SelectItem value='신입'>신입</SelectItem>
                <SelectItem value='경력무관'>경력무관</SelectItem>
              </SelectContent>
            </Select>
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
                  setPageSize(Number(v));
                  setPage(1);
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

        {/* Results */}
        <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-4'>
          {data?.items.map((it) => (
            <JobCard key={it.id} item={it} />
          ))}
        </div>

        {/* Pagination */}
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
            페이지 {page} / {totalPages}
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              if (page < totalPages) setPage((p) => p + 1);
            }}
            disabled={loading || page >= totalPages}
          >
            다음
          </Button>
        </div>
      </main>
    </>
  );
}
