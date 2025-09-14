import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const { email, password, name } = await req.json();

  const emailN = String(email ?? '')
    .toLowerCase()
    .trim();
  const nameN = String(name ?? '').trim();
  const pw = String(password ?? '');

  if (!emailN || !nameN || pw.length < 4) {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email: emailN } });
  if (exists) {
    return NextResponse.json({ error: 'DUPLICATE_EMAIL' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(pw, 10);

  const user = await prisma.user.create({
    data: { email: emailN, name: nameN, passwordHash },
    select: { id: true, email: true, name: true },
  });

  return NextResponse.json({ ok: true, user });
}
