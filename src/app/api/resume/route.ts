import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserIdFromJwtCookie } from '@/server/auth';
import { put, del } from '@vercel/blob';

export const runtime = 'nodejs';

function sanitizeName(name: string) {
  return name.replace(/[^\w.\-]+/g, '_');
}

export async function GET() {
  const userId = await getUserIdFromJwtCookie();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const latest = await prisma.resumeFile.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, originalName: true, size: true, createdAt: true },
  });

  return NextResponse.json({ latest: latest ?? null });
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromJwtCookie();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const fd = await req.formData();
  const file = fd.get('resume');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'resume required' }, { status: 400 });
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'pdf only' }, { status: 400 });
  }

  const safeName = sanitizeName(file.name || 'resume.pdf');
  const key = `resumes/${userId}/${Date.now()}-${safeName}`;

  const blob = await put(key, file, {
    access: 'public',
    contentType: file.type || 'application/pdf',
    addRandomSuffix: false,
  });

  const created = await prisma.resumeFile.create({
    data: {
      userId,
      originalName: file.name || 'resume.pdf',
      storedPath: blob.url,
      mimeType: file.type || 'application/pdf',
      size: file.size,
    },
    select: {
      id: true,
      originalName: true,
      size: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, latest: created });
}

export async function DELETE() {
  const userId = await getUserIdFromJwtCookie();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const latest = await prisma.resumeFile.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  if (!latest) return NextResponse.json({ ok: true });

  try {
    await del(latest.storedPath);
  } catch {
  }
  await prisma.resumeFile.delete({ where: { id: latest.id } });

  return NextResponse.json({ ok: true });
}
