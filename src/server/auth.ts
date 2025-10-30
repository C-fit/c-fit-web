import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import {SignJWT, jwtVerify} from 'jose';
import type { NextResponse } from 'next/server';



export const runtime = 'nodejs';
const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME ?? 'session';
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const JWT_ISSUER = process.env.JWT_ISSUER ?? 'c-fit';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? 'c-fit-web';
const SESSION_TTL = parseInt(process.env.SESSION_TTL ?? '2592000', 10);

export class HttpError extends Error {
  constructor(public status: number, message = 'HTTP Error') {
    super(message);
    this.name = 'HttpError';
  }
}


export async function signSessionJwt(user: {id: string; email?: string | null}) {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({email: user.email ?? undefined})
    .setProtectedHeader({alg: 'HS256', type: 'JWT'})
    .setIssuedAt(now)
    .setSubject(user.id)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(now + SESSION_TTL)
    .sign(JWT_SECRET);
}



export async function attachSessionCookie(res: NextResponse, token: string): Promise<NextResponse> {
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL,
  });
  return res;
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