//src/lib/auth.ts
import 'server-only';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

const key = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret');

export type SessionUser = {
  id: string;
  email: string | null;
  name: string | null;
};

export interface SessionPayload extends JWTPayload {
  user: SessionUser;
}

// ===== JWT utils =====
export async function encrypt(payload: SessionPayload): Promise<string> {
  return await new SignJWT(payload) 
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key);
}

export async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    return payload as SessionPayload;
  } catch {
    return null;
  }
}


export async function setSessionCookie(user: SessionUser) {
  const expAt = Date.now() + 24 * 60 * 60 * 1000;
  const expires = new Date(expAt);
  const token = await encrypt({ user, exp: Math.floor(expAt / 1000) });

  const jar = await cookies(); 
  jar.set('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set('session', '', { expires: new Date(0), path: '/' });
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get('session')?.value;
  if (!token) return null;
  return await decrypt(token);
}

export async function updateSession(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  if (!token) return;

  const parsed = await decrypt(token);
  if (!parsed?.user) return;

  const expAt = Date.now() + 24 * 60 * 60 * 1000;
  parsed.exp = Math.floor(expAt / 1000);

  const jar = await cookies();
  jar.set('session', await encrypt(parsed), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(expAt),
  });
}
