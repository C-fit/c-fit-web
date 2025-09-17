
// src/app/api/saved/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || 'uid';

/**
 * 쿠키에서 사용자 식별값을 읽어와 DB User를 보장합니다.
 * - 쿠키 값이 이메일이면 email 기준 upsert
 * - 이메일이 아니면 id로 조회, 없으면 placeholder email로 생성
 */
async function getOrCreateUserIdFromCookie(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(AUTH_COOKIE)?.value;
  if (!raw) return null;

  // 1) 이메일인 경우: email 기준으로 upsert하여 id 확보
  if (raw.includes('@')) {
    const user = await prisma.user.upsert({
      where: { email: raw },
      update: {},
      create: {
        email: raw,
        // 최소 필수값만 채움
        passwordHash: 'external-auth', // 외부 인증 표시용 placeholder
        name: null,
      },
      select: { id: true },
    });
    return user.id;
  }

  // 2) 이메일이 아닌 경우: raw를 id로 간주
  const found = await prisma.user.findUnique({
    where: { id: raw },
    select: { id: true },
  });
  if (found) return found.id;

  // 없으면 placeholder email로 생성
  const placeholderEmail = `user-${raw}@local.invalid`;
  const created = await prisma.user.create({
    data: {
      id: raw, // 스키마가 String @id 라서 임의 문자열 사용 가능
      email: placeholderEmail,
      passwordHash: 'external-auth',
      name: null,
    },
    select: { id: true },
  });
  return created.id;
}

export async function GET() {
  const userId = await getOrCreateUserIdFromCookie();
  if (!userId) {
    // 비로그인은 빈 목록 반환
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
  const userId = await getOrCreateUserIdFromCookie();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
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
=======
// app/api/saved/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { jobId, save } = await req.json()
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 })

  if (save) {
    await prisma.savedJob.upsert({
      where: { userId_jobPostingId: { userId: session.userId, jobPostingId: jobId } },
      update: {},
      create: { userId: session.userId, jobPostingId: jobId }
    })
  } else {
    await prisma.savedJob.deleteMany({
      where: { userId: session.userId, jobPostingId: jobId }
    })
  }
  return NextResponse.json({ ok: true, saved: !!save })

}
