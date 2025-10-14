// src/app/api/fit/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrCreateUserIdFromCookie } from '@/server/auth';
import { randomUUID } from 'crypto';


export const runtime = 'nodejs';

// ====== Upstream config ======
const BASE =
  process.env.LLM_API_BASE ??
  'https://c-fit-langgraph-backend-latest.onrender.com';
const KEY = process.env.LLM_API_KEY ?? '';
const KEY_HEADER = process.env.LLM_API_KEY_HEADER ?? 'Authorization';
const DEBUG = (process.env.DEBUG_FIT ?? '0') === '1';

// 공통 타임아웃(기본 20분)
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? 1200000);
const FIT_T = Number(process.env.FIT_TIMEOUT_MS ?? TIMEOUT_MS ?? 480000);

const log = (...a: unknown[]) => {
  if (DEBUG) console.log('[FIT]', ...a);
};

const authHeaders = (): Record<string, string> => {
  if (!KEY) return {};
  if (KEY_HEADER.toLowerCase() === 'authorization') {
    return { Authorization: `Bearer ${KEY}` };
  }
  return { [KEY_HEADER]: KEY };
};

// fetch + 텍스트 래퍼 (abort + 소요시간 포함)
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
      headers: res.headers,
      text: txt,
      ms,
    };
  } finally {
    clearTimeout(t);
  }
}

// ============ 핸들러 ============
export async function POST(req: NextRequest) {
  const userId = await getOrCreateUserIdFromCookie();
  if (!userId)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ct = req.headers.get('content-type')?.toLowerCase() ?? '';

  // -----------------------------
  // [NEW] multipart/form-data → /oneclick/fit 단일 호출 브랜치
  // -----------------------------
  if (ct.includes('multipart/form-data')) {
    let step: 'oneclick' | 'save' = 'oneclick';
    const threadId = randomUUID();

    try {
      const fdIn = await req.formData();
      const _thread = String(fdIn.get('thread_id') || '') || threadId;
      const fileAny = fdIn.get('resume_file');
      const jdUrl = String(fdIn.get('jd_url') || '').trim();

      if (!(fileAny instanceof File)) {
        return NextResponse.json(
          { error: 'resume_file required' },
          { status: 400 }
        );
      }
      if (!jdUrl) {
        return NextResponse.json({ error: 'jd_url required' }, { status: 400 });
      }

      // 업스트림으로 그대로 포워딩할 폼 생성
      const fdOut = new FormData();
      fdOut.set('thread_id', _thread);
      fdOut.set('resume_file', fileAny, fileAny.name || 'resume.pdf');
      fdOut.set('jd_url', jdUrl);

      log('ONECLICK start /oneclick/fit', {
        url: `${BASE}/oneclick/fit`,
        thread_id: _thread,
        jd_url: jdUrl,
        file_name: (fileAny as File).name,
        file_type: (fileAny as File).type,
        file_size: (fileAny as File).size,
      });

      const headers = new Headers(authHeaders());
      const r = await fetchText(`${BASE}/oneclick/fit`, {
        method: 'POST',
        headers,
        body: fdOut,
        timeoutMs: FIT_T,
      });

      log('ONECLICK done', {
        status: r.status,
        ms: r.ms,
        ct: r.headers.get('content-type'),
        bodyPeek: r.text.slice(0, 200),
      });

      if (!r.ok) {
        throw new Error(
          `oneclick failed: HTTP ${r.status} ${r.statusText} :: ${r.text}`
        );
      }

      // D) 결과 저장
      step = 'save';
      const created = await prisma.fitResult.create({
        data: {
          userId,
          resumeFileId: null, // 새 플로우는 파일을 DB에 저장하지 않음
          jobUrl: jdUrl,
          raw: r.text, // 원본 저장(파싱은 뷰 레벨에서)
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
        resultId: created.id,
        status: 'completed',
        thread_id: _thread,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      log('✗ Failed', { step, error: msg });
      return NextResponse.json(
        { error: 'upstream failed', step, detail: msg },
        { status: 502 }
      );
    }
  }
}
