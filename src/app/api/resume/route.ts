import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/db';
import { getOrCreateUserIdFromCookie } from '@/server/auth';

export const runtime = 'nodejs';

const MAX_BYTES = 20 * 1024 * 1024;
function isPdf(file: File) {
  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  return mime === 'application/pdf' || name.endsWith('.pdf');
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getOrCreateUserIdFromCookie();
    if (!userId)
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const form = await req.formData().catch(() => null);
    if (!form)
      return NextResponse.json(
        { error: 'formdata parse failed' },
        { status: 400 }
      );

    const file = form.get('resume') as File | null;
    if (!file)
      return NextResponse.json({ error: 'file required' }, { status: 400 });
    if (!isPdf(file))
      return NextResponse.json({ error: 'pdf only' }, { status: 400 });
    if (typeof file.size === 'number' && file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'file too large' }, { status: 413 });
    }

    // 저장 경로 구성
    const uploadsRoot = path.join(process.cwd(), 'uploads');
    const yyyyMMdd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const dir = path.join(uploadsRoot, userId, yyyyMMdd);
    await fs.mkdir(dir, { recursive: true });

    const safeName = file.name.replace(/[^\w.\-가-힣\[\]\(\) ]+/g, '_');
    const ts = Date.now();
    const filename = `${ts}__${safeName}`;
    const storedPath = path.join(dir, filename);

    // 파일 저장
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(storedPath, buf);

    // DB 기록
    const rec = await prisma.resumeFile.create({
      data: {
        userId,
        originalName: file.name,
        storedPath,
        mimeType: file.type || 'application/pdf',
        size: Number(file.size || buf.length),
      },
      select: { id: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, resumeId: rec.id });
  } catch (e) {
    console.error('resume upload error:', e);
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
=======
import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Mock resume data - in real app, fetch from database
    const resume = {
      id: "1",
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: "010-1234-5678",
      summary: "3년차 프론트엔드 개발자로 React, TypeScript를 활용한 웹 애플리케이션 개발 경험이 있습니다.",
      skills: ["React", "TypeScript", "JavaScript", "HTML", "CSS", "Next.js"],
      experience: [
        {
          company: "스타트업 A",
          position: "프론트엔드 개발자",
          duration: "2022.03 - 현재",
          description: "React와 TypeScript를 활용한 웹 애플리케이션 개발",
        },
      ],
      education: [
        {
          school: "한국대학교",
          degree: "컴퓨터공학과 학사",
          duration: "2017.03 - 2021.02",
        },
      ],
      updatedAt: new Date(),
    }

    return NextResponse.json({ resume })
  } catch (error) {
    console.error("Resume fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const resumeData = await request.json()

    // In real app, save to database
    console.log("Saving resume for user:", user.id, resumeData)

    return NextResponse.json({
      message: "Resume updated successfully",
      resume: { ...resumeData, updatedAt: new Date() },
    })
  } catch (error) {
    console.error("Resume update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })

  }
}
