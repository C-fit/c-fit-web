// src/app/api/resume/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrCreateUserIdFromCookie } from '@/server/auth';
import { put, del } from '@vercel/blob';

export const runtime = 'nodejs';

function sanitizeName(name: string) {
  return name.replace(/[^\w.\-]+/g, '_');
}

// GET: 최신 이력서 메타만 리턴
export async function GET() {
  const userId = await getOrCreateUserIdFromCookie();
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

// POST: multipart/form-data { resume: File } → Blob에 저장 → DB 기록 (Prisma create 사용)
export async function POST(req: NextRequest) {
  const userId = await getOrCreateUserIdFromCookie();
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

  // Blob 업로드 (액세스 정책은 필요에 맞게 변경)
  const blob = await put(key, file, {
    access: 'public',
    contentType: file.type || 'application/pdf',
    addRandomSuffix: false,
  });

  // ✅ Prisma ORM으로 깔끔하게 insert (updatedAt 없음)
  const created = await prisma.resumeFile.create({
    data: {
      userId,
      originalName: file.name || 'resume.pdf',
      storedPath: blob.url,
      mimeType: file.type || 'application/pdf',
      size: file.size,
      // createdAt은 @default(now())로 자동 채워짐
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

// DELETE: 최신 이력서 삭제 (Blob + DB)
export async function DELETE() {
  const userId = await getOrCreateUserIdFromCookie();
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
    // Blob이 이미 없을 수 있음 — 무시
  }
  await prisma.resumeFile.delete({ where: { id: latest.id } });

  return NextResponse.json({ ok: true });
}
