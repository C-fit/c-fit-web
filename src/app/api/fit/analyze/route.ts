// src/app/api/fit/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrCreateUserIdFromCookie } from '@/server/auth';
import { randomUUID } from 'crypto';
import type { Prisma as P } from '@prisma/client';

export const runtime = 'nodejs';

// Upstream config
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

async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    init.timeoutMs ?? TIMEOUT_MS
  );
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    return { res, text };
  } finally {
    clearTimeout(timer);
  }
}

function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractForDb(obj: unknown): {
  score: number | null;
  summary: string | null;
  strengths: string[];
  gaps: string[];
  recommendations: string[]; // 문자열 리스트(P1: ... 형태)
} {
  const asRec = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null;

  if (asRec(obj) && obj.version === 'fit.v1.1') {
    const score =
      asRec(obj.overall) && typeof (obj.overall as any).score === 'number'
        ? (obj.overall as any).score
        : null;
    const summary =
      typeof obj.summary_short === 'string' ? obj.summary_short : null;
    const strengths = Array.isArray(obj.strengths)
      ? obj.strengths.filter((x: unknown) => typeof x === 'string')
      : [];
    const gaps = Array.isArray(obj.gaps)
      ? obj.gaps.filter((x: unknown) => typeof x === 'string')
      : [];
    const recs = Array.isArray(obj.recommendations)
      ? (obj.recommendations as any[]).map((r) => {
          const p = typeof r?.priority === 'string' ? r.priority : 'P3';
          const a = typeof r?.action === 'string' ? r.action : '';
          const i =
            typeof r?.impact === 'string' ? ` (impact: ${r.impact})` : '';
          return `${p}: ${a}${i}`;
        })
      : [];
    return { score, summary, strengths, gaps, recommendations: recs };
  }

  // v1 (구버전) 또는 텍스트 fallback
  if (asRec(obj) && obj.version === 'fit.v1') {
    const score =
      asRec(obj.overall) && typeof (obj.overall as any).score === 'number'
        ? (obj.overall as any).score
        : null;
    const summary =
      typeof obj.summary_short === 'string' ? obj.summary_short : null;
    return { score, summary, strengths: [], gaps: [], recommendations: [] };
  }

  // 마크다운-only 또는 알 수 없음
  if (asRec(obj) && typeof (obj as any).applicant_recruitment === 'string') {
    const md = String((obj as any).applicant_recruitment);
    return {
      score: null,
      summary: md.slice(0, 450),
      strengths: [],
      gaps: [],
      recommendations: [],
    };
  }

  return {
    score: null,
    summary: null,
    strengths: [],
    gaps: [],
    recommendations: [],
  };
}

// Vercel Blob URL에서 파일을 불러오는 보조 함수 (JSON 경로에서 사용)
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

export async function POST(req: NextRequest) {
  const userId = await getOrCreateUserIdFromCookie();
  if (!userId)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ct = (req.headers.get('content-type') || '').toLowerCase();
  let step: 'parse' | 'oneclick' | 'save' = 'parse';

  try {
    // ===== (A) multipart/form-data: 프런트에서 파일을 직접 보냄 =====
    if (ct.includes('multipart/form-data')) {
      const fdIn = await req.formData();
      const thread = (fdIn.get('thread_id') as string) || randomUUID();
      const resumeAny = fdIn.get('resume_file');
      const jdUrl = (fdIn.get('jd_url') as string)?.trim();

      if (!(resumeAny instanceof File))
        return NextResponse.json(
          { error: 'resume_file required' },
          { status: 400 }
        );
      if (!jdUrl)
        return NextResponse.json({ error: 'jd_url required' }, { status: 400 });

      const fdOut = new FormData();
      fdOut.set('thread_id', thread);
      fdOut.set('jd_url', jdUrl);
      fdOut.set('resume_file', resumeAny, resumeAny.name || 'resume.pdf');

      step = 'oneclick';
      const headers = new Headers({
        ...authHeaders(),
        Accept: 'application/json',
      });
      const { res, text } = await fetchWithTimeout(`${BASE}/oneclick/fit`, {
        method: 'POST',
        headers,
        body: fdOut,
        timeoutMs: FIT_T,
      });
      log('ONECLICK(form)', res.status, text.slice(0, 180));
      if (!res.ok)
        return NextResponse.json(
          { error: 'upstream failed', detail: text },
          { status: 502 }
        );

      // JSON 파싱
      const parsed = tryParseJson(text);
      const rawToSave: P.InputJsonValue =
        parsed ?? (text as unknown as P.InputJsonValue);
      const pick = extractForDb(parsed ?? {});

      step = 'save';
      const saved = await prisma.fitResult.create({
        data: {
          userId,
          resumeFileId: null,
          jobUrl: jdUrl,
          raw: rawToSave,
          status: 'completed',
          score: pick.score,
          summary: pick.summary ?? undefined,
          strengths: pick.strengths,
          gaps: pick.gaps,
          recommendations: pick.recommendations,
        },
      });

      return NextResponse.json({
        ok: true,
        resultId: saved.id,
        status: 'completed',
        thread_id: thread,
      });
    }

    // ===== (B) JSON: 서버에 저장된 최신 이력서를 사용 =====
    const bodyUnknown = await req.json().catch(() => ({}));
    const body =
      typeof bodyUnknown === 'object' && bodyUnknown
        ? (bodyUnknown as Record<string, unknown>)
        : {};
    const jdUrl =
      typeof body['jd_url'] === 'string' ? body['jd_url'].trim() : '';
    const resumeFileId =
      typeof body['resumeFileId'] === 'string'
        ? body['resumeFileId']
        : undefined;
    const thread =
      typeof body['thread_id'] === 'string' && body['thread_id'].trim()
        ? (body['thread_id'] as string)
        : randomUUID();
    if (!jdUrl)
      return NextResponse.json({ error: 'jd_url required' }, { status: 400 });

    // 최신 이력서 로드
    const rf = resumeFileId
      ? await prisma.resumeFile.findFirst({
          where: { id: resumeFileId, userId },
        })
      : await prisma.resumeFile.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
    if (!rf)
      return NextResponse.json({ error: 'resume not found' }, { status: 400 });

    const { blob } = await loadBlobFromUrl(
      rf.storedPath,
      rf.mimeType || 'application/pdf'
    );

    const fdOut = new FormData();
    fdOut.set('thread_id', thread);
    fdOut.set('jd_url', jdUrl);
    fdOut.set('resume_file', blob, rf.originalName || 'resume.pdf');

    step = 'oneclick';
    const headers = new Headers({
      ...authHeaders(),
      Accept: 'application/json',
    });
    const { res, text } = await fetchWithTimeout(`${BASE}/oneclick/fit`, {
      method: 'POST',
      headers,
      body: fdOut,
      timeoutMs: FIT_T,
    });
    log('ONECLICK(json)', res.status, text.slice(0, 180));
    if (!res.ok)
      return NextResponse.json(
        { error: 'upstream failed', detail: text },
        { status: 502 }
      );

    const parsed = tryParseJson(text);
    const rawToSave: P.InputJsonValue =
      parsed ?? (text as unknown as P.InputJsonValue);
    const pick = extractForDb(parsed ?? {});

    step = 'save';
    const saved = await prisma.fitResult.create({
      data: {
        userId,
        resumeFileId: rf.id,
        jobUrl: jdUrl,
        raw: rawToSave,
        status: 'completed',
        score: pick.score,
        summary: pick.summary ?? undefined,
        strengths: pick.strengths,
        gaps: pick.gaps,
        recommendations: pick.recommendations,
      },
    });

    return NextResponse.json({
      ok: true,
      resultId: saved.id,
      status: 'completed',
      thread_id: thread,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log('✗ Failed', { step, error: msg });
    return NextResponse.json(
      { error: 'handler error', step, detail: msg },
      { status: 500 }
    );
  }
}
