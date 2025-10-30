// src/app/api/saved/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromJwtCookie, requireAuth, HttpError } from '@/server/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const userId = await getUserIdFromJwtCookie();
  if (!userId) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const rows = await prisma.savedJob.findMany({
    where: { userId },
    include: { jobPosting: true },
    orderBy: { createdAt: 'desc' },
  });

  const items = rows.map((r) => ({
    id: r.jobPosting.id,
    url: r.jobPosting.url,
    title: r.jobPosting.title,
    companyName: r.jobPosting.companyName,
    jobName: r.jobPosting.jobName,
    savedAt: r.createdAt,
  }));
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireAuth();
  } catch (err: unknown) {
    if (err instanceof HttpError && err.status === 401) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    throw err;
  }

  const { jobId, save } = await req.json().catch(() => ({}));
  if (!jobId || typeof save !== 'boolean') {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  // 존재하는 공고인지 확인
  const post = await prisma.jobPosting.findUnique({ where: { id: jobId } });
  if (!post) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  if (save) {
    await prisma.savedJob.upsert({
      where: { userId_jobPostingId: { userId, jobPostingId: jobId } },
      create: { userId, jobPostingId: jobId },
      update: {},
    });
    return NextResponse.json({ saved: true });
  } else {
    await prisma.savedJob.deleteMany({
      where: { userId, jobPostingId: jobId },
    });
    return NextResponse.json({ saved: false });
  }
}

export async function DELETE(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireAuth();
  } catch (err: unknown) {
    if (err instanceof HttpError && err.status === 401) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    throw err;
  }

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // 본인 소유만 안전하게 삭제 (없어도 에러 없이 넘어가도록)
  const { count } = await prisma.savedJob.deleteMany({
    where: { id, userId },
  });

  return NextResponse.json({ ok: true, deleted: count });
}
