import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { generateJobRecommendations, type UserProfile } from "@/lib/ai-recommendations"

// Mock job data for demonstration
const mockJobs = [
  {
    id: "1",
    title: "시니어 프론트엔드 개발자",
    company: "네이버",
    location: "서울 강남구",
    salary: 80000000,
    jobType: "정규직",
    description: "React, TypeScript를 활용한 웹 서비스 개발",
    requirements: "React, TypeScript, JavaScript, HTML, CSS",
    postedAt: new Date(),
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
  {
    id: "2",
    title: "백엔드 개발자",
    company: "카카오",
    location: "서울 판교",
    salary: 75000000,
    jobType: "정규직",
    description: "Node.js, Python을 활용한 서버 개발",
    requirements: "Node.js, Python, PostgreSQL, AWS",
    postedAt: new Date(),
    deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
  },
  {
    id: "3",
    title: "AI 엔지니어",
    company: "삼성전자",
    location: "서울 서초구",
    salary: 90000000,
    jobType: "정규직",
    description: "머신러닝 모델 개발 및 최적화",
    requirements: "Python, TensorFlow, PyTorch, Machine Learning",
    postedAt: new Date(),
    deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
  },
]

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

    // Mock user profile - in real app, this would come from database
    const userProfile: UserProfile = {
      skills: ["React", "TypeScript", "JavaScript", "Node.js"],
      experience: ["Frontend Development", "Web Development"],
      preferences: {
        location: "서울",
        salary: 70000000,
        jobType: "정규직",
        industry: "IT",
      },
    }

    const recommendations = generateJobRecommendations(userProfile, mockJobs, 10)

    const jobsWithRecommendations = recommendations.map((rec) => {
      const job = mockJobs.find((j) => j.id === rec.jobId)
      return {
        ...job,
        aiScore: rec.score,
        aiReasons: rec.reasons,
        compatibility: rec.compatibility,
      }
    })

    return NextResponse.json({
      recommendations: jobsWithRecommendations,
      userProfile,
    })
  } catch (error) {
    console.error("Recommendations error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
