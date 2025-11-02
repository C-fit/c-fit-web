// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

export const runtime = 'nodejs';

const PEPPER = process.env.PASSWORD_PEPPER ?? '';
const JWT_SECRET = process.env.JWT_SECRET ?? '';

const key = new TextEncoder().encode(JWT_SECRET);

async function signSessionJwt(payload: { sub: string; email: string }) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is missing');
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

function attachSessionCookie(res: NextResponse, token: string) {
  res.cookies.set({
    name: 'auth',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export async function POST(req: NextRequest) {
  let step = 'start';
  try {
    const body = await req.json();
    const email = String(body?.email ?? '')
      .trim()
      .toLowerCase();
    const password = String(body?.password ?? '');
    step = 'lookup';

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, passwordHash: true },
    });
    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: 'invalid_credentials' },
        { status: 401 }
      );
    }

    step = 'compare';
    const ok = await bcrypt.compare(password + PEPPER, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: 'invalid_credentials' },
        { status: 401 }
      );
    }

    step = 'sign';
    const token = await signSessionJwt({
      sub: String(user.id),
      email: user.email,
    });

    step = 'respond';
    const safeUser = {
      id: String(user.id),
      email: user.email,
      name: user.name ?? null,
    };
    const res = NextResponse.json({ ok: true, user: safeUser });
    return attachSessionCookie(res, token);
  } catch (e) {
    console.error('[auth/login]', step, e);
    return NextResponse.json(
      { error: 'internal_error', step },
      { status: 500 }
    );
  }
}
