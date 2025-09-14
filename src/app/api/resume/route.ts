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
