import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const key = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret');

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const emailN = String(email ?? '')
    .toLowerCase()
    .trim();
  const pw = String(password ?? '');

  if (!emailN || !pw) {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: emailN } });
  if (!user) {
    return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
  }

  // 가입 시 해시 저장했다고 가정하고, 여기서 비교
  const ok = await bcrypt.compare(pw, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
  }

  // JWT 세션 발급 후 쿠키에 저장(Next 15: await cookies())
  const expMs = Date.now() + 24 * 60 * 60 * 1000;
  const token = await new SignJWT({
    user: { id: user.id, email: user.email, name: user.name },
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key);

  const jar = await cookies();
  jar.set('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(expMs),
  });

  // 프론트 컨텍스트가 바로 setUser() 하도록 user도 반환
  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name },
  });
}
