// src/app/api/fit/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrCreateUserIdFromCookie } from '@/server/auth';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';



const BASE =
  process.env.LLM_API_BASE ??
  'https://c-fit-langgraph-backend-latest.onrender.com';
const KEY = process.env.LLM_API_KEY ?? '';
const KEY_HEADER = process.env.LLM_API_KEY_HEADER ?? 'Authorization';
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? 1200000);
const DEBUG = (process.env.DEBUG_FIT ?? '0') === '1';

// 단계별 타임아웃 (없으면 TIMEOUT_MS, 그마저 없으면 120초)
const RES_T = Number(process.env.RESUME_TIMEOUT_MS ?? process.env.TIMEOUT_MS ?? 480000);
const JD_T  = Number(process.env.JD_TIMEOUT_MS ?? process.env.TIMEOUT_MS ?? 480000);
const FIT_T = Number(process.env.FIT_TIMEOUT_MS ?? process.env.TIMEOUT_MS ?? 480000);


const log = (...a: any[]) => {
  if (DEBUG) console.log('[FIT]', ...a);
};
const authHeaders = () =>
  !KEY
    ? {}
    : KEY_HEADER.toLowerCase() === 'authorization'
    ? { Authorization: `Bearer ${KEY}` }
    : { [KEY_HEADER]: KEY };

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

export async function POST(req: NextRequest) {
  const userId = await getOrCreateUserIdFromCookie();
  if (!userId)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { jobUrl } = await req.json().catch(() => ({} as any));
  if (!jobUrl)
    return NextResponse.json({ error: 'jobUrl required' }, { status: 400 });

  // 최신 이력서
  const latest = await prisma.resumeFile.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  if (!latest)
    return NextResponse.json({ error: 'resume not found' }, { status: 404 });

  const buf = await fs.readFile(latest.storedPath);
  const blob = new Blob([buf], { type: latest.mimeType || 'application/pdf' });

  const threadId = randomUUID();
  let step: 'resume' | 'jd' | 'fit' | 'save' = 'resume';

  try {
    // A) /process/resume  (multipart/form-data)
    {
      const fd = new FormData();
      fd.set('thread_id', threadId);

      // ✅ 파일명은 ASCII로 고정
      const safeName = 'resume.pdf';
      fd.set('resume_file', blob, safeName);

      log('A start /process/resume', {
        url: `${BASE}/process/resume`,
        threadId,
        file: safeName,
        size: buf.length,
        mime: blob.type,
      });

      const a = await fetchText(`${BASE}/process/resume`, {
        method: 'POST',
        headers: authHeaders(), // Content-Type은 FormData가 자동 설정
        body: fd,
        timeoutMs: RES_T, // (있다면 단계별 타임아웃)
      });

      log('A done', {
        status: a.status,
        ms: a.ms,
        // 응답 헤더/타입도 같이 참고 (문자열 200자만 찍음)
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
    const form = new URLSearchParams({
      thread_id: String(threadId),
      jd_url: jobUrl,
    });
    log('B start /process/jd', {
      url: `${BASE}/process/jd`,
      threadId,
      jd_url: jobUrl,
    });
    const b = await fetchText(`${BASE}/process/jd`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...authHeaders(),
      },
      body: form.toString(),
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
    const c = await fetchText(`${BASE}/analyze/fit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...authHeaders(),
      },
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

    // D) 결과 저장 (문자열 원문 → 클라 파서)
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
  } catch (e: any) {
    log('✗ Failed', { step, threadId, error: String(e?.message ?? e) });
    return NextResponse.json(
      {
        error: 'upstream failed',
        step,
        thread_id: threadId,
        detail: String(e?.message ?? e),
      },
      { status: 502 }
    );
  }
}
