// src/server/auth.ts
import 'server-only';

import { NextResponse} from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import * as jose from 'jose';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

// ===== Config / Types =====
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';
const JWT_KEY = new TextEncoder().encode(JWT_SECRET);

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type PublicUser = {
  id: string;
  email: string | null;
  name: string | null;
};

type SessionPayload = { sub: string }; // userId
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
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_KEY);
}

// 편의: user 객체나 id로 바로 토큰 만들기
export async function signSessionFromUser(
  userOrId: { id: string } | string
): Promise<string> {
  const sub = typeof userOrId === 'string' ? userOrId : userOrId.id;
  return signSessionJwt({ sub });
}

export async function verifySessionJwt(
  token: string
): Promise<SessionPayload & { iat: number; exp: number }> {
  const { payload } = await jose.jwtVerify(token, JWT_KEY, {
    algorithms: ['HS256'],
  });
  return payload as SessionPayload & { iat: number; exp: number };
}

// ===== Cookie Utils =====
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


export async function readSessionToken(
  req?: Request
): Promise<string | undefined> {
  if (req) {
    return getCookieFromHeader(req.headers.get('cookie'), 'session');
  }
  const jar = await nextCookies();
  return jar.get('session')?.value;
}


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


export function clearSessionCookie<T extends NextResponse>(res: T): T {
  res.cookies.set({
    name: 'session',
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
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
