// src/app/api/fit/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrCreateUserIdFromCookie } from '@/server/auth';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

const BASE =
  process.env.LLM_API_BASE ??
  'https://c-fit-langgraph-backend-latest.onrender.com';
const KEY = process.env.LLM_API_KEY ?? '';
const KEY_HEADER = process.env.LLM_API_KEY_HEADER ?? 'Authorization';
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? 1200000);
const DEBUG = (process.env.DEBUG_FIT ?? '0') === '1';

// 단계별 타임아웃
const RES_T = Number(
  process.env.RESUME_TIMEOUT_MS ?? process.env.TIMEOUT_MS ?? 480000
);
const JD_T = Number(
  process.env.JD_TIMEOUT_MS ?? process.env.TIMEOUT_MS ?? 480000
);
const FIT_T = Number(
  process.env.FIT_TIMEOUT_MS ?? process.env.TIMEOUT_MS ?? 480000
);

const log = (...a: unknown[]) => {
  if (DEBUG) console.log('[FIT]', ...a);
};
const authHeaders = (): Record<string, string> => {
  if (!KEY) return {};
  if (KEY_HEADER.toLowerCase() === 'authorization')
    return { Authorization: `Bearer ${KEY}` };
  return { [KEY_HEADER]: KEY };
};

async function fetchText(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
) {
  const ctrl = new AbortController();
  const start = Date.now();
  const t = setTimeout(() => ctrl.abort(), init.timeoutMs ?? TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const txt = await res.text();
    const ms = Date.now() - start;
    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      text: txt,
      ms,
      headers: res.headers,
    };
  } finally {
    clearTimeout(t);
  }
}

/** storedPath가 URL이면 fetch, 로컬 경로면 fs에서 읽어 Blob 생성 */
async function loadPdfBlob(
  storedPath: string,
  mimeHint?: string
): Promise<{ blob: Blob; size: number; mime: string }> {
  const isUrl =
    /^https?:\/\//i.test(storedPath) || /^s3:\/\//i.test(storedPath);
  if (isUrl) {
    const r = await fetch(storedPath, { cache: 'no-store' });
    if (!r.ok)
      throw new Error(`blob fetch failed: ${r.status} ${r.statusText}`);
    const arr = await r.arrayBuffer();
    const mime = mimeHint || r.headers.get('content-type') || 'application/pdf';
    return {
      blob: new Blob([arr], { type: mime }),
      size: arr.byteLength,
      mime,
    };
  }

  // 로컬 파일 (개발용)
  const { readFile } = await import('fs/promises');
  const buf = await readFile(storedPath); // Buffer

  // ✅ 타입 안전: Buffer → Uint8Array 로 변환
  const uint8 = new Uint8Array(buf.byteLength);
  uint8.set(buf);

  const mime = mimeHint || 'application/pdf';
  return {
    blob: new Blob([uint8], { type: mime }),
    size: uint8.byteLength,
    mime,
  };
}

export async function POST(req: NextRequest) {
  const userId = await getOrCreateUserIdFromCookie();
  if (!userId)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { jobUrl } = (await req.json().catch(() => ({}))) as {
    jobUrl?: string;
  };
  if (!jobUrl)
    return NextResponse.json({ error: 'jobUrl required' }, { status: 400 });

  // 최신 이력서
  const latest = await prisma.resumeFile.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  if (!latest)
    return NextResponse.json({ error: 'resume not found' }, { status: 404 });

  // Blob 준비
  const {
    blob: pdfBlob,
    size: pdfSize,
    mime: pdfMime,
  } = await loadPdfBlob(
    latest.storedPath,
    latest.mimeType || 'application/pdf'
  );

  const threadId = randomUUID();
  let step: 'resume' | 'jd' | 'fit' | 'save' = 'resume';

  try {
    // A) /process/resume (multipart/form-data)
    {
      const fd = new FormData();
      fd.set('thread_id', threadId);
      fd.set('resume_file', pdfBlob, 'resume.pdf');

      log('A start /process/resume', {
        url: `${BASE}/process/resume`,
        threadId,
        file: 'resume.pdf',
        size: pdfSize,
        mime: pdfMime,
      });

      // ✅ 헤더는 Headers로 생성 → HeadersInit 보장
      const headersA = new Headers(authHeaders());
      const a = await fetchText(`${BASE}/process/resume`, {
        method: 'POST',
        headers: headersA,
        body: fd,
        timeoutMs: RES_T,
      });

      log('A done', {
        status: a.status,
        ms: a.ms,
        ct: a.headers.get('content-type'),
        bodyPeek: a.text.slice(0, 200),
      });
      if (!a.ok)
        throw new Error(
          `A failed: HTTP ${a.status} ${a.statusText} :: ${a.text}`
        );
    }

    // B) /process/jd (x-www-form-urlencoded)
    step = 'jd';
    const bForm = new URLSearchParams({
      thread_id: String(threadId),
      jd_url: jobUrl,
    });
    log('B start /process/jd', {
      url: `${BASE}/process/jd`,
      threadId,
      jd_url: jobUrl,
    });

    const headersB = new Headers(authHeaders());
    headersB.set('Content-Type', 'application/x-www-form-urlencoded');

    const b = await fetchText(`${BASE}/process/jd`, {
      method: 'POST',
      headers: headersB,
      body: bForm.toString(),
      timeoutMs: JD_T,
    });
    log('B done', {
      status: b.status,
      ms: b.ms,
      bodyPeek: b.text.slice(0, 200),
    });
    if (!b.ok)
      throw new Error(
        `B failed: HTTP ${b.status} ${b.statusText} :: ${b.text}`
      );

    // C) /analyze/fit (x-www-form-urlencoded)
    step = 'fit';
    const cForm = new URLSearchParams({ thread_id: String(threadId) });
    log('C start /analyze/fit', { url: `${BASE}/analyze/fit`, threadId });

    const headersC = new Headers(authHeaders());
    headersC.set('Content-Type', 'application/x-www-form-urlencoded');

    const c = await fetchText(`${BASE}/analyze/fit`, {
      method: 'POST',
      headers: headersC,
      body: cForm.toString(),
      timeoutMs: FIT_T,
    });
    log('C done', {
      status: c.status,
      ms: c.ms,
      bodyPeek: c.text.slice(0, 200),
    });
    if (!c.ok)
      throw new Error(
        `C failed: HTTP ${c.status} ${c.statusText} :: ${c.text}`
      );

    // D) 결과 저장
    step = 'save';
    const created = await prisma.fitResult.create({
      data: {
        userId,
        resumeFileId: latest.id,
        jobUrl,
        raw: c.text,
        status: 'completed',
        score: null,
        summary: null,
        strengths: [],
        gaps: [],
        recommendations: [],
      },
      select: { id: true },
    });
    log('✓ Completed', {
      threadId,
      resultId: created.id,
      rawLen: c.text.length,
    });

    return NextResponse.json({
      ok: true,
      resultId: created.id,
      status: 'completed',
      thread_id: threadId,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    log('✗ Failed', { step, threadId, error: msg });
    return NextResponse.json(
      { error: 'upstream failed', step, thread_id: threadId, detail: msg },
      { status: 502 }
    );
  }
}
