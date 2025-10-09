// src/lib/auth.ts
import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

/** ===== Types ===== */
export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
};

export type SessionPayload = {
  user: SessionUser;
  exp: number;
  iat?: number;
};

export type LoginResult =
  | { success: true; user: SessionUser }
  | { success: false; error: string };

/** ===== Config ===== */
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'session';
const key = new TextEncoder().encode(JWT_SECRET);
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** ===== JWT utils ===== */
export async function encrypt<T extends object>(payload: T): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key);
}

export async function decrypt<T = unknown>(input: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(input, key, { algorithms: ['HS256'] });
    return payload as T;
  } catch {
    return null;
  }
}

/** ===== Auth core ===== */
export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  const emailN = String(email ?? '')
    .toLowerCase()
    .trim();
  const pw = String(password ?? '');

  if (!emailN || !pw) {
    return { success: false, error: '이메일/비밀번호를 입력해 주세요.' };
  }

  // 1) 유저 조회
  const user = await prisma.user.findUnique({ where: { email: emailN } });
  const hash: string | null | undefined = user?.passwordHash;

  // 2) user 없음 또는 해시 없음 → 동일 에러로 반환 (정보 노출 방지)
  if (!user || !hash) {
    return {
      success: false,
      error: '이메일 또는 비밀번호가 올바르지 않습니다.',
    };
  }

  // 3) bcrypt 비교 (여기서 hash는 string으로 좁혀짐)
  const ok = await bcrypt.compare(pw, hash);
  if (!ok) {
    return {
      success: false,
      error: '이메일 또는 비밀번호가 올바르지 않습니다.',
    };
  }

  // 4) 세션 발급
  const expAt = Date.now() + ONE_DAY_MS;
  const token = await encrypt<SessionPayload>({
    user: { id: user.id, email: user.email, name: user.name },
    exp: Math.floor(expAt / 1000),
  });

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(expAt),
    secure: process.env.NODE_ENV === 'production',
  });

  return {
    success: true,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

export async function logout() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, '', { expires: new Date(0), path: '/' });
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const session = jar.get(COOKIE_NAME)?.value;
  if (!session) return null;
  const payload = await decrypt<SessionPayload>(session);
  if (!payload?.user) return null;
  return payload;
}

/** (선택) 요청마다 세션 연장 */
export async function updateSession(request: NextRequest) {
  const session = request.cookies.get(COOKIE_NAME)?.value;
  if (!session) return;

  const parsed = await decrypt<SessionPayload>(session);
  if (!parsed?.user) return;

  const expAt = Date.now() + ONE_DAY_MS;
  parsed.exp = Math.floor(expAt / 1000);

  const res = NextResponse.next();
  res.cookies.set({
    name: COOKIE_NAME,
    value: await encrypt(parsed),
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    expires: new Date(expAt),
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
