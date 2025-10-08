// src/app/api/resume/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { prisma } from '@/lib/db';
import { getOrCreateUserIdFromCookie } from '@/server/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const userId = await getOrCreateUserIdFromCookie();
  if (!userId)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form)
    return NextResponse.json({ error: 'formdata required' }, { status: 400 });

  const file = form.get('resume') as File | null; // ← 클라에서 name="resume"로 전송
  if (!file)
    return NextResponse.json({ error: 'resume required' }, { status: 400 });
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'pdf only' }, { status: 415 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.mkdir('uploads', { recursive: true });
  const filename = `${userId}-${Date.now()}.pdf`;
  const storedPath = `uploads/${filename}`;
  await fs.writeFile(storedPath, bytes);

  const rec = await prisma.resumeFile.create({
    data: {
      userId,
      originalName: (file as any).name || 'resume.pdf',
      storedPath,
      mimeType: file.type,
      size: bytes.length,
    },
    select: { id: true, originalName: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, resume: rec });
}

export async function GET(req: NextRequest) {
  // 최신 업로드 반환 (대시보드에서 상태 확인용)
  const userId = await getOrCreateUserIdFromCookie();
  if (!userId)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const latest = await prisma.resumeFile.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      originalName: true,
      storedPath: true,
      createdAt: true,
      mimeType: true,
      size: true,
    },
  });

  return NextResponse.json({ latest });
}

export async function DELETE(req: NextRequest) {
  const userId = await getOrCreateUserIdFromCookie();
  if (!userId)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const latest = await prisma.resumeFile.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  if (!latest) return NextResponse.json({ ok: true }); // 삭제할 것 없음

  // 파일 삭제 (실패해도 계속 진행)
  try {
    await fs.unlink(latest.storedPath);
  } catch {}

  // DB 레코드 삭제
  await prisma.resumeFile.delete({ where: { id: latest.id } });

  return NextResponse.json({ ok: true });
}
