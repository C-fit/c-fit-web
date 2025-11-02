// src/server/auth.ts
import { NextResponse } from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import {SignJWT, jwtVerify} from 'jose';
import type { NextResponse } from 'next/server';



// ===== Config / Types =====
const JWT_SECRET = process.env.JWT_SECRET ?? '';
const JWT_KEY = new TextEncoder().encode(JWT_SECRET);

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type SessionPayload = { sub: string }; // userId
export type PublicUser = {
  id: string;
  email: string | null;
  name: string | null;
};
export type Session = { user: PublicUser } | null;

// ===== Password (bcryptjs) =====
export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  // $2b$... 형태 해시와 호환
  return bcrypt.compare(plain, hash);
}

// ===== JWT =====
export async function signSessionJwt(payload: SessionPayload): Promise<string> {
  if (!JWT_SECRET) throw new Error('JWT_SECRET missing');
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_KEY);
}

export async function verifySessionJwt(
  token: string
): Promise<SessionPayload & { iat: number; exp: number }> {
  const { payload } = await jwtVerify(token, JWT_KEY);
  return payload as SessionPayload & { iat: number; exp: number };
}

// ===== Cookie Helpers =====
function getCookieFromHeader(
  header: string | null,
  name: string
): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

/**
 * server-side read: route 핸들러에서 req를 전달하면 헤더에서 읽고,
 * 없으면 next/headers.cookies()로 읽음
 */
export async function readSessionToken(
  req?: Request
): Promise<string | undefined> {
  if (req) {
    return getCookieFromHeader(req.headers.get('cookie'), 'session');
  }
  const jar = await nextCookies(); // Promise<ReadonlyRequestCookies>
  return jar.get('session')?.value;
}

/** 응답 쿠키에 세션 토큰 심기 (쓰기는 응답에서만 가능) */
export function attachSessionCookie<T extends NextResponse>(
  res: T,
  token: string
): T {
  res.cookies.set({
    name: 'session',
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}

/** 세션 쿠키 제거(로그아웃용) */
export function clearSessionCookie<T extends NextResponse>(res: T): T {
  res.cookies.set({
    name: 'session',
    value: '',
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  });
  return res;
}

// ===== Session APIs (getSession / guards) =====
export async function getUserIdFromJwtCookie(
  req?: Request
): Promise<string | null> {
  try {
    const token = await readSessionToken(req);
    if (!token) return null;
    const payload = await verifySessionJwt(token);
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getSession(req?: Request): Promise<Session> {
  const userId = await getUserIdFromJwtCookie(req);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) return null;

  return { user };
}

/** 없으면 401 던짐 */
export async function requireAuth(req?: Request): Promise<PublicUser> {
  const session = await getSession(req);
  if (!session) throw new HttpError(401, 'unauthorized');
  return session.user;
}

export function clearSessionCookieOn<T extends NextResponse>(res: T): T {
  res.cookies.set(AUTH_COOKIE, '', { path: '/', expires: new Date(0) });
  return res;
}



export async function getUserIdFromJwtCookie() : Promise<string | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  try {
    const {payload} = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    const sub = payload.sub as string | undefined;
    const email = payload.email as string | undefined;
    if (!sub && !email) return null;
    const user = sub 
      ? await prisma.user.findUnique({where: {id: sub}})
      : await prisma.user.findUnique({where: {email : email}});
    return user?.id ?? null;
  } catch {
    return null;
  }
}


export async function requireAuth() : Promise<string> {
  const userId = await getUserIdFromJwtCookie();
  if (!userId) throw new HttpError(401, 'Unauthorized');
  return userId;
}