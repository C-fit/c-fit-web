// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  verifyPassword,
  signSessionJwt,
  attachSessionCookie,
} from '@/server/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: 'missing_credentials' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
      select: { id: true, email: true, name: true, passwordHash: true },
    });
    if (!user?.passwordHash) {
      await new Promise((r) => setTimeout(r, 150));
      return NextResponse.json(
        { error: 'invalid_credentials' },
        { status: 401 }
      );
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok)
      return NextResponse.json(
        { error: 'invalid_credentials' },
        { status: 401 }
      );

    const token = await signSessionJwt({ sub: user.id });
    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
    return attachSessionCookie(res, token);
  } catch (e) {
    console.error('[auth/login]', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
