// src/app/api/fit/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrCreateUserIdFromCookie } from '@/server/auth';
import { promises as fs } from 'fs';
import { EXAMPLE_COMPARISON, EXAMPLE_REVIEW } from '@/demo/analysis-examples';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const userId = await getOrCreateUserIdFromCookie();
  if (!userId)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const jobUrl = body?.jobUrl as string | undefined;
  const demoType = body?.demoType as 'comparison' | 'review' | undefined;
  if (!jobUrl)
    return NextResponse.json({ error: 'jobUrl required' }, { status: 400 });

  // === 데모 모드: 예시 TXT를 그대로 raw로 저장 ===
  if (demoType) {
    // 1) 유저가 없으면 만들어 FK 에러 방지
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `demo-${userId}@local.invalid`,
        passwordHash: 'demo',
        name: 'Demo User',
      },
    });

    // 2) resumeFileId가 필수인 스키마를 대비해 더미 이력서를 보장
    let latest = await prisma.resumeFile.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latest) {
      await fs.mkdir('uploads', { recursive: true });
      const p = `uploads/demo-${userId}.pdf`;
      // 최소한의 PDF 시그니처(진짜 파일일 필요는 없음)
      await fs.writeFile(
        p,
        '%PDF-1.4\n1 0 obj <<>> endobj\ntrailer <<>>\n%%EOF\n'
      );
      latest = await prisma.resumeFile.create({
        data: {
          userId,
          originalName: 'demo.pdf',
          storedPath: p,
          mimeType: 'application/pdf',
          size: 64,
        },
      });
    }

    // 3) 예시 텍스트 선택
    const rawText =
      demoType === 'comparison' ? EXAMPLE_COMPARISON : EXAMPLE_REVIEW;

    // 4) 결과 저장 (raw에 "문자열" 그대로 넣음 → 클라 파서가 텍스트를 분석)
    const created = await prisma.fitResult.create({
      data: {
        userId,
        resumeFileId: latest.id, // 스키마가 필수여도 OK
        jobUrl,
        // 점수/요약은 비워둬도 되고, 있으면 보여줌
        score: null,
        summary: null,
        strengths: [],
        gaps: [],
        recommendations: [],
        raw: rawText, // <= 중요: 텍스트 원문 저장
        status: 'completed',
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, resultId: created.id, demo: true });
  }

  // === 실제 LLM 모드(배포 후) ===
  // ... (네가 쓰던 기존 코드 유지)
}
