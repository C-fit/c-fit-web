// app/api/jobs/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

function toInt(v: string | null, d: number | null = null) {
  if (v === null) return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}
function rangeArray(min: number, max: number) {
  const a = [];
  for (let i = min; i <= max; i++) a.push(i);
  return a;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, toInt(searchParams.get('page'), 1)!);
  const pageSize = Math.min(
    100,
    Math.max(1, toInt(searchParams.get('pageSize'), 20)!)
  );

  const q = (searchParams.get('q') || '').trim();
  const job = (searchParams.get('job') || '').trim(); // 콤마구분 가능: "프론트엔드 개발자,웹 퍼블리셔"
  const company = (searchParams.get('company') || '').trim();


  const exp = (searchParams.get('exp') || '').trim(); // "신입" | "경력무관" | ""(모두)
  const sort = (searchParams.get('sort') || 'recent').trim(); // "recent" | "company" | "title"

  // careerYears(정수배열)에 대해 구간 필터: [minYear, maxYear] 중 하나라도 포함되면 매칭
  const minYear = toInt(searchParams.get('minYear'), null);
  const maxYear = toInt(searchParams.get('maxYear'), null);
  const minY = minYear ?? 0;
  const maxY = maxYear ?? 20;
  const yearList = rangeArray(minY, maxY);

  const where: any = {};

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { companyName: { contains: q, mode: 'insensitive' } },
      { jobName: { contains: q, mode: 'insensitive' } },


    ];
  }
  if (job) {
    const jobs = job
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (jobs.length) where.jobName = { in: jobs };
  }
  if (company) where.companyName = { contains: company, mode: 'insensitive' };





  if (exp) {
    // "신입" 또는 "경력무관" 지정 시 빠른 필터
    where.experienceLevel = exp;
  }

  // 경력 연차 구간 필터(기본: 0~20). 배열에 교집합이 있으면 매칭
  if (yearList.length) {
    where.careerYears = { hasSome: yearList };
  }

  const orderBy =
    sort === 'company'
      ? { companyName: 'asc' as const }
      : sort === 'title'
      ? { title: 'asc' as const }
      : { updatedAt: 'desc' as const }; // default recent

  const [items, total] = await Promise.all([
    prisma.jobPosting.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        url: true,
        companyName: true,
        title: true,
        jobName: true,
        experienceLevel: true,
        careerYears: true,
        location: true,
        deadline: true,
        updatedAt: true,
      },
    }),
    prisma.jobPosting.count({ where }),
  ]);

  // 로그인 사용자의 즐겨찾기 표시
  const session = await getSession();
  let savedSet = new Set<string>();
  if (session?.userId && items.length) {
    const saved = await prisma.savedJob.findMany({
      where: {
        userId: session.userId,
        jobPostingId: { in: items.map((it) => it.id) },
      },
      select: { jobPostingId: true },
    });
    savedSet = new Set(saved.map((s) => s.jobPostingId));
  }

  const payload = items.map((it) => ({ ...it, saved: savedSet.has(it.id) }));
  return NextResponse.json({ items: payload, total, page, pageSize });
}
