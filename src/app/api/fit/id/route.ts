export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
// import { getOrCreateUserIdFromCookie } from '@/server/auth';

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params;

  // 데모 확인을 위해 일단 사용자 검사 생략(원하면 주석 해제)
  // const userId = await getOrCreateUserIdFromCookie();
  // if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const rec = await prisma.fitResult.findUnique({ where: { id } });
  if (!rec /* || rec.userId !== userId */) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json({ item: rec });
}
