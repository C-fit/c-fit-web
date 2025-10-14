// src/app/api/fit/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrCreateUserIdFromCookie } from '@/server/auth';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

// ===== Upstream config =====
const BASE =
  process.env.LLM_API_BASE ??
  'https://c-fit-langgraph-backend-latest.onrender.com';
const KEY = process.env.LLM_API_KEY ?? '';
const KEY_HEADER = process.env.LLM_API_KEY_HEADER ?? 'Authorization';
const DEBUG = (process.env.DEBUG_FIT ?? '0') === '1';

// timeouts
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? 1200000); // 20m
const FIT_T = Number(process.env.FIT_TIMEOUT_MS ?? TIMEOUT_MS ?? 480000);

const log = (...a: unknown[]) => {
  if (DEBUG) console.log('[FIT]', ...a);
};
const authHeaders = (): Record<string, string> => {
  if (!KEY) return {};
  return KEY_HEADER.toLowerCase() === 'authorization'
    ? { Authorization: `Bearer ${KEY}` }
    : { [KEY_HEADER]: KEY };
};

// fetch wrapper
async function fetchText(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
) {
  const controller = new AbortController();
  const started = Date.now();
  const timer = setTimeout(
    () => controller.abort(),
    init.timeoutMs ?? TIMEOUT_MS
  );
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
      text,
      ms: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
}

// Vercel Blob에서 파일 로드 (URL만 지원)
async function loadBlobFromUrl(url: string, mimeHint = 'application/pdf') {
  const headers = new Headers();
  const tok = process.env.BLOB_READ_WRITE_TOKEN;
  if (tok) headers.set('Authorization', `Bearer ${tok}`);

  const r = await fetch(url, { headers, cache: 'no-store' });
  if (!r.ok) throw new Error(`blob fetch failed: ${r.status} ${r.statusText}`);

  const ab = await r.arrayBuffer();
  const mime = r.headers.get('content-type') || mimeHint;
  const blob = new Blob([ab], { type: mime });
  return { blob, size: ab.byteLength, mime };
}

// 최신(또는 지정) 이력서 → Blob
async function getResumeBlobForUser(userId: string, resumeFileId?: string) {
  const rf = resumeFileId
    ? await prisma.resumeFile.findFirst({ where: { id: resumeFileId, userId } })
    : await prisma.resumeFile.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

  if (!rf) throw new Error('resume not found');
  if (!/^https?:\/\//i.test(rf.storedPath))
    throw new Error('resume storedPath must be URL');

  const { blob, size, mime } = await loadBlobFromUrl(
    rf.storedPath,
    rf.mimeType || 'application/pdf'
  );
  return { rf, blob, size, mime };
}

// ============ handler ============
export async function POST(req: NextRequest) {
  const userId = await getOrCreateUserIdFromCookie();
  if (!userId)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const contentType = (req.headers.get('content-type') || '').toLowerCase();
  let step: 'parse' | 'prepare' | 'oneclick' | 'save' = 'parse';

  try {
    // ===== (1) multipart/form-data 경로 =====
    if (contentType.includes('multipart/form-data')) {
      const fdIn = await req.formData();

      const threadIdRaw = fdIn.get('thread_id');
      const thread =
        typeof threadIdRaw === 'string' && threadIdRaw.trim().length > 0
          ? threadIdRaw
          : randomUUID();

      const resumeEntry = fdIn.get('resume_file');
      const jdUrlEntry = fdIn.get('jd_url');

      if (typeof jdUrlEntry !== 'string' || jdUrlEntry.trim().length === 0) {
        return NextResponse.json({ error: 'jd_url required' }, { status: 400 });
      }
      const jdUrl = jdUrlEntry.trim();

      if (!(resumeEntry instanceof File)) {
        return NextResponse.json(
          { error: 'resume_file required (File)' },
          { status: 400 }
        );
      }
      const resumeFile: File = resumeEntry;
      const resumeName =
        resumeFile.name && resumeFile.name.trim().length > 0
          ? resumeFile.name
          : 'resume.pdf';

      // 업스트림 호출
      const fdOut = new FormData();
      fdOut.set('thread_id', thread);
      fdOut.set('jd_url', jdUrl);
      fdOut.set('resume_file', resumeFile, resumeName); // File extends Blob

      step = 'oneclick';
      const headers = new Headers(authHeaders());
      const r = await fetchText(`${BASE}/oneclick/fit`, {
        method: 'POST',
        headers,
        body: fdOut,
        timeoutMs: FIT_T,
      });
      log('ONECLICK(form)', {
        status: r.status,
        ms: r.ms,
        peek: r.text.slice(0, 160),
      });

      if (!r.ok) {
        return NextResponse.json(
          { error: 'upstream failed', detail: r.text },
          { status: 502 }
        );
      }

      step = 'save';
      const saved = await prisma.fitResult.create({
        data: {
          userId,
          resumeFileId: null,
          jobUrl: jdUrl,
          raw: r.text, // 문자열로 저장해도 Prisma Json 필드 허용
          status: 'completed',
          score: null,
          summary: null,
          strengths: [],
          gaps: [],
          recommendations: [],
        },
      });

      return NextResponse.json({
        ok: true,
        resultId: saved.id,
        status: 'completed',
        thread_id: thread,
      });
    }

    // ===== (2) JSON 경로: 최신(또는 지정) 이력서 사용 =====
    const bodyUnknown = await req.json().catch(() => ({}));
    // bodyUnknown은 unknown이므로 안전 파싱
    const body =
      typeof bodyUnknown === 'object' && bodyUnknown !== null
        ? (bodyUnknown as Record<string, unknown>)
        : {};
    const jdUrlRaw = body['jd_url'] ?? body['jobUrl'];
    const jdUrl = typeof jdUrlRaw === 'string' ? jdUrlRaw.trim() : '';

    if (!jdUrl) {
      return NextResponse.json(
        {
          error: 'invalid payload',
          hint: 'send multipart form-data or JSON with jd_url',
        },
        { status: 400 }
      );
    }

    const resumeFileId =
      typeof body['resumeFileId'] === 'string'
        ? body['resumeFileId']
        : undefined;
    const thread =
      typeof body['thread_id'] === 'string' &&
      body['thread_id'].trim().length > 0
        ? (body['thread_id'] as string)
        : randomUUID();

    step = 'prepare';
    const { rf, blob } = await getResumeBlobForUser(userId, resumeFileId);

    const fdOut = new FormData();
    fdOut.set('thread_id', thread);
    fdOut.set('jd_url', jdUrl);
    // Blob을 filename과 함께 전달
    fdOut.set('resume_file', blob, rf.originalName || 'resume.pdf');

    step = 'oneclick';
    const headers = new Headers(authHeaders());
    const r = await fetchText(`${BASE}/oneclick/fit`, {
      method: 'POST',
      headers,
      body: fdOut,
      timeoutMs: FIT_T,
    });
    log('ONECLICK(json)', {
      status: r.status,
      ms: r.ms,
      peek: r.text.slice(0, 160),
    });

    if (!r.ok) {
      return NextResponse.json(
        { error: 'upstream failed', detail: r.text },
        { status: 502 }
      );
    }

    step = 'save';
    const saved = await prisma.fitResult.create({
      data: {
        userId,
        resumeFileId: rf.id,
        jobUrl: jdUrl,
        raw: r.text,
        status: 'completed',
        score: null,
        summary: null,
        strengths: [],
        gaps: [],
        recommendations: [],
      },
    });

    return NextResponse.json({
      ok: true,
      resultId: saved.id,
      status: 'completed',
      thread_id: thread,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log('✗ Failed', { step, error: msg });
    return NextResponse.json(
      { error: 'handler error', step, detail: msg },
      { status: 500 }
    );
  }
}
