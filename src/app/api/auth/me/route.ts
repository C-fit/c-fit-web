// src/app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserIdFromJwtCookie } from '@/server/auth';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const uid = await getUserIdFromJwtCookie();
    if (!uid) return NextResponse.json({ user: null }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { id: true, email: true, name: true },
    });
    if (!user) return NextResponse.json({ user: null }, { status: 401 });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
