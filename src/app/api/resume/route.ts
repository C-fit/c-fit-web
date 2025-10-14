// src/app/api/resume/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrCreateUserIdFromCookie } from '@/server/auth';
import { put, del } from '@vercel/blob';
import { randomUUID } from 'crypto'; // ✅ 추가

export const runtime = 'nodejs';

function sanitizeName(name: string) {
  return name.replace(/[^\w.\-]+/g, '_');
}

// GET: 최신 이력서 메타만 리턴
export async function GET() {
  const userId = await getOrCreateUserIdFromCookie();
  if (!userId)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const latest = await prisma.resumeFile.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, originalName: true, size: true, createdAt: true },
  });

  return NextResponse.json({ latest: latest ?? null });
}

// POST: multipart/form-data { resume: File } → Blob에 저장 → DB 기록(✅ raw insert)
export async function POST(req: NextRequest) {
  const userId = await getOrCreateUserIdFromCookie();
  if (!userId)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const fd = await req.formData();
  const file = fd.get('resume') as File | null;
  if (!file)
    return NextResponse.json({ error: 'resume required' }, { status: 400 });
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'pdf only' }, { status: 400 });
  }

  const safeName = sanitizeName(file.name || 'resume.pdf');
  const key = `resumes/${userId}/${Date.now()}-${safeName}`;

  // Blob 업로드 (public/비공개는 정책에 맞춰 조정하세요)
  const blob = await put(key, file, {
    access: 'public',
    contentType: file.type || 'application/pdf',
    addRandomSuffix: false,
  });

  // 🔥 Prisma create 대신 raw SQL로 updatedAt까지 채워 넣기
  const id = randomUUID();
  const rows = await prisma.$queryRaw<
    { id: string; originalName: string; size: number; createdAt: Date }[]
  >`
    INSERT INTO "ResumeFile"
      ("id","userId","originalName","storedPath","mimeType","size","createdAt","updatedAt")
    VALUES
      (${id}, ${userId}, ${file.name || 'resume.pdf'}, ${blob.url}, ${
    file.type || 'application/pdf'
  }, ${file.size}, NOW(), NOW())
    RETURNING "id","originalName","size","createdAt"
  `;

  const created = rows[0];
  return NextResponse.json({ ok: true, latest: created });
}

// DELETE: 최신 이력서 삭제 (Blob + DB)
export async function DELETE() {
  const userId = await getOrCreateUserIdFromCookie();
  if (!userId)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const latest = await prisma.resumeFile.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  if (!latest) return NextResponse.json({ ok: true });

  try {
    await del(latest.storedPath);
  } catch {}
  await prisma.resumeFile.delete({ where: { id: latest.id } });

  return NextResponse.json({ ok: true });
}
