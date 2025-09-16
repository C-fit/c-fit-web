import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrCreateUserIdFromCookie } from '@/server/auth';
import { promises as fs } from 'fs';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const userId = await getOrCreateUserIdFromCookie();
  if (!userId)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { jobUrl } = await req.json().catch(() => ({}));
  if (!jobUrl)
    return NextResponse.json({ error: 'jobUrl required' }, { status: 400 });

  // 최신 이력서 1건
  const latest = await prisma.resumeFile.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  if (!latest)
    return NextResponse.json({ error: 'resume not found' }, { status: 404 });

  const fileBuffer = await fs.readFile(latest.storedPath);
  const fileBlob = new Blob([fileBuffer], {
    type: latest.mimeType || 'application/pdf',
  });
  const form = new FormData();
  form.set('resume', fileBlob, latest.originalName || 'resume.pdf');
  form.set('jobUrl', jobUrl);

  const base = process.env.LLM_API_BASE;
  if (!base) {
    // 백엔드 없을 때 개발용 mock
    return NextResponse.json({
      ok: true,
      resultId: 'dev-mock-' + Date.now(),
      summary: 'LLM 백엔드 미설정. 개발용 더미 응답입니다.',
    });
  }

  const r = await fetch(`${base}/fit/analyze`, { method: 'POST', body: form });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    return NextResponse.json(
      { error: 'upstream failed', upstream: text.slice(0, 500) },
      { status: 502 }
    );
  }
  const data = await r.json().catch(() => ({}));
  return NextResponse.json({ ok: true, ...data });
}
