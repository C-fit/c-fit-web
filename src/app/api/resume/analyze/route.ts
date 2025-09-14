import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { resume } = await request.json()

    // Mock AI analysis - in real app, use actual AI service
    const analysis = {
      strengths: [
        "프론트엔드 개발 분야에서 강점을 보임",
        "React와 TypeScript 경험이 풍부함",
        "최신 기술 트렌드에 관심이 많음",
      ],
      improvements: ["백엔드 기술 스택 추가 권장", "프로젝트 관리 경험 보완", "영어 능력 향상 필요"],
      matchingJobs: ["프론트엔드 개발자", "React 개발자", "UI/UX 개발자"],
      score: 85,
      summary:
        "AI 분석 결과: 프론트엔드 개발 분야에서 강점을 보이고 있습니다. React와 TypeScript 경험이 풍부하여 대부분의 프론트엔드 포지션에 적합합니다.",
    }

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error("Resume analysis error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
