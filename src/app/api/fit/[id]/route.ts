import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrCreateUserIdFromCookie } from '@/server/auth';

export const runtime = 'nodejs';

// Next.js 15: params는 Promise이므로 await 해서 사용
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  // 로그인/세션 확인 (게스트 세션이라도 userId 확보)
  const userId = await getOrCreateUserIdFromCookie();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const rec = await prisma.fitResult.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      jobUrl: true,
      status: true,
      score: true,
      summary: true,
      strengths: true,
      gaps: true,
      recommendations: true,
      raw: true,
      createdAt: true,
    },
  });

  if (!rec) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (rec.userId !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  return NextResponse.json({ result: rec });
}
