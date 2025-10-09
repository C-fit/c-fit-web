import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { setSessionCookie, type SessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const email =
    typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const pw = typeof body?.password === 'string' ? body.password : '';

  if (!email || !pw) {
    return NextResponse.json({ error: 'MISSING_CREDENTIALS' }, { status: 400 });
  }

  // 1) 사용자 조회
  const user = await prisma.user.findUnique({ where: { email } });

  // 2) 비밀번호 해시 확인 (null 가능성 처리)
  const hash: string | null = user?.passwordHash ?? null;
  if (!user || !hash) {
    return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
  }

  const ok = await bcrypt.compare(pw, hash);
  if (!ok) {
    return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
  }

  // 3) 세션 쿠키 설정
  const sessUser: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
  };
  await setSessionCookie(sessUser);

  return NextResponse.json({ ok: true, user: sessUser });
}
