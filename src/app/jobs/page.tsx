'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const [job, setJob] = useState(''); // 콤마 구분 가능(자유 텍스트)
  const [company, setCompany] = useState('');
  const [exp, setExp] = useState<'all' | '신입' | '경력무관'>('all'); // ← 빈 문자열 대신 'all' 사용
  const [years, setYears] = useState<[number, number]>([0, 20]);
  const [sort, setSort] = useState<'recent' | 'company' | 'title'>('recent');

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
    if (job) p.set('job', job);
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
    setJob('');
    setCompany('');
    setExp('all');
    setYears([0, 20]);
    setSort('recent');
    setPage(1);
    setPageSize(20);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* 헤더: 제목 + 대시보드 / 초기화 */}
      <div className="flex items-center justify-between gap-2 flex-wrap w-full">
        <h1 className="text-2xl font-semibold min-w-0">채용공고 검색</h1>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/dashboard" className="inline-flex">
            <Button variant="outline" className="h-9 whitespace-nowrap">대시보드</Button>
          </Link>
          <Button variant="ghost" className="h-9 whitespace-nowrap" onClick={clearFilters} type="button">
            필터 초기화
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mt-2">
        <div className="space-y-1">
          <Label>검색어</Label>
          <Input
            placeholder="제목/회사/직무…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="space-y-1">
          <Label>직무(콤마로 여러 개)</Label>
          <Input
            placeholder="예: 프론트엔드 개발자, 백엔드 개발자"
            value={job}
            onChange={(e) => {
              setJob(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="space-y-1">
          <Label>회사</Label>
          <Input
            placeholder="회사명"
            value={company}
            onChange={(e) => {
              setCompany(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="space-y-1">
          <Label>정렬</Label>
          <Select
            value={sort}
            onValueChange={(v: 'recent' | 'company' | 'title') => {
              setSort(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="정렬" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">최신순</SelectItem>
              <SelectItem value="company">회사명</SelectItem>
              <SelectItem value="title">제목</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label>경력 구간 (년)</Label>
          <div className="px-2">
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
          <div className="text-sm text-muted-foreground">
            선택: {years[0]} ~ {years[1]}년
          </div>
        </div>

        <div className="space-y-1">
          <Label>경력 표기</Label>
          <Select
            value={exp}
            onValueChange={(v: 'all' | '신입' | '경력무관') => {
              setExp(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="전체" />
            </SelectTrigger>
            <SelectContent>
              {/* ⛔️ 빈 문자열 금지: 'all'을 사용 */}
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="신입">신입</SelectItem>
              <SelectItem value="경력무관">경력무관</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 우상단: 총 건수 / 페이지당 */}
        <div className="space-y-1 md:col-span-1 md:justify-self-end flex items-end justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {loading ? '불러오는 중…' : data ? `총 ${data.total}건` : ''}
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">페이지당</Label>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.items.map((it) => (
          <JobCard key={it.id} item={it} />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
        >
          이전
        </Button>
        <div className="text-sm">
          페이지 {page} / {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (page < totalPages) setPage((p) => p + 1);
          }}
          disabled={loading || page >= totalPages}
        >
          다음
        </Button>
      </div>
    </div>
  );
}
