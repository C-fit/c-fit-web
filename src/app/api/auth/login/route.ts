// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { signSessionJwt, attachSessionCookie } from '@/server/auth';

export const runtime = 'nodejs';

type LoginBody = {
  email?: string;
  password?: string;
  name?: string | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as LoginBody;

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const name =
      typeof body.name === 'string'
        ? body.name.trim()
        : body.name === null
        ? null
        : undefined;

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'email required' }, { status: 400 });
    }


    const user = await prisma.user.upsert({
      where: { email },
      update: { ...(typeof name !== 'undefined' ? { name } : {}) },
      create: {
        email,
        name: typeof name !== 'undefined' ? name : null,
        passwordHash: 'external-auth',
      },
      select: { id: true, email: true, name: true },
    });

    const token = await signSessionJwt(user);
    const res = NextResponse.json({ ok: true, user });
    return attachSessionCookie(res, token); 
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
