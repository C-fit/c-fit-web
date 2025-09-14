// src/lib/auth.ts
import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db'; // ← 올려주신 db.ts 사용

const key = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret');

// --- JWT 유틸 ---
export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key);
}

export async function decrypt(input: string): Promise<any | null> {
  try {
    const { payload } = await jwtVerify(input, key, { algorithms: ['HS256'] });
    return payload;
  } catch {
    return null;
  }
}

// --- 핵심: 로그인 ---
export async function login(email: string, password: string) {
  const emailN = String(email || '')
    .toLowerCase()
    .trim();
  const pw = String(password || '');

  // 1) DB에서 유저 조회 (Prisma)
  const user = await prisma.user.findUnique({ where: { email: emailN } });
  if (!user) {
    return {
      success: false,
      error: '이메일 또는 비밀번호가 올바르지 않습니다.',
    };
  }

  // 2) bcrypt 해시 비교 (가입 시 해시로 저장되어 있어야 함)
  //    user.passwordHash 필드가 있다고 가정
  const ok = await bcrypt.compare(pw, (user as any).passwordHash);
  if (!ok) {
    return {
      success: false,
      error: '이메일 또는 비밀번호가 올바르지 않습니다.',
    };
  }

  // 3) JWT 세션 발급 + Next 15: await cookies()
  const expAt = Date.now() + 24 * 60 * 60 * 1000;
  const expires = new Date(expAt);
  const token = await encrypt({
    user: { id: user.id, email: user.email, name: user.name },
    exp: Math.floor(expAt / 1000),
  });

  const jar = await cookies(); // ✅ 반드시 await
  jar.set('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires,
  });

  return {
    success: true,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

// --- 로그아웃 ---
export async function logout() {
  const jar = await cookies(); // ✅ await
  jar.set('session', '', { expires: new Date(0), path: '/' });
}

// --- 세션 읽기 ---
export async function getSession() {
  const jar = await cookies(); // ✅ await
  const session = jar.get('session')?.value;
  if (!session) return null;

  const payload = await decrypt(session);
  if (!payload?.user) return null;

  return payload; // { user: {id,email,name}, exp: ... }
}

// --- (선택) 세션 연장 미들웨어 ---
export async function updateSession(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  if (!session) return;

  const parsed = await decrypt(session);
  if (!parsed?.user) return;

  const expAt = Date.now() + 24 * 60 * 60 * 1000;
  parsed.exp = Math.floor(expAt / 1000);

  const res = NextResponse.next();
  res.cookies.set({
    name: 'session',
    value: await encrypt(parsed),
    httpOnly: true,
    path: '/',
    expires: new Date(expAt),
  });
  return res;
}
