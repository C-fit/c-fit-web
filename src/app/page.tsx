"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { JobCard } from "@/components/job-card"
import { JobFilters } from "@/components/job-filters"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { JobPosting, JobSearchFilters } from "@/lib/types"

// Mock data for demonstration
const mockJobs: JobPosting[] = [
  {
    id: "1",
    title: "프론트엔드 개발자",
    companyName: "네이버",
    description: "React, TypeScript를 활용한 웹 서비스 개발을 담당하실 프론트엔드 개발자를 모집합니다.",
    requirements: "React, TypeScript 경험 3년 이상",
    preferred: "Next.js, GraphQL 경험자 우대",
    location: "서울 강남구",
    salary: "연봉 4,000~6,000만원",
    jobType: "full-time",
    techStack: ["React", "TypeScript", "Next.js", "GraphQL"],
    sourceUrl: "https://example.com",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    title: "백엔드 개발자",
    companyName: "카카오",
    description: "Spring Boot를 활용한 대규모 서비스 백엔드 개발을 담당하실 개발자를 찾습니다.",
    requirements: "Java, Spring 경험 5년 이상",
    preferred: "MSA, Kubernetes 경험자 우대",
    location: "경기 성남시",
    salary: "연봉 5,000~7,000만원",
    jobType: "full-time",
    techStack: ["Java", "Spring Boot", "MySQL", "Redis"],
    sourceUrl: "https://example.com",
    createdAt: new Date("2024-01-14"),
    updatedAt: new Date("2024-01-14"),
  },
  {
    id: "3",
    title: "AI 엔지니어",
    companyName: "삼성전자",
    description: "머신러닝 모델 개발 및 AI 서비스 구축을 담당하실 AI 엔지니어를 모집합니다.",
    requirements: "Python, TensorFlow/PyTorch 경험",
    preferred: "MLOps, 클라우드 경험자 우대",
    location: "서울 서초구",
    salary: "연봉 6,000~8,000만원",
    jobType: "full-time",
    techStack: ["Python", "TensorFlow", "PyTorch", "AWS"],
    sourceUrl: "https://example.com",
    createdAt: new Date("2024-01-13"),
    updatedAt: new Date("2024-01-13"),
  },
]

export default function HomePage() {
  const [filters, setFilters] = useState<JobSearchFilters>({})

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center py-12 mb-12">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
              <Badge variant="secondary" className="text-sm">
                AI 추천
              </Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-balance">
              AI로 분석하는 
              <br />
              <span className="text-primary">나의 합격 가능성</span>
            </h1>
            <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto">
             가고 싶은 기업의 채용 공고에 맞춰 AI가 적합도를 분석하고 합격률을 높이는 방법을 제안합니다.
             
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8">
                내 핏(Fit) 분석하기
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 bg-transparent">
                채용공고 둘러보기
              </Button>
            </div>
          </div>
        </section>

        {/* Job Listings Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">최신 채용공고</h2>
              <p className="text-muted-foreground">AI가 추천하는 맞춤형 일자리를 확인해보세요</p>
            </div>
            <JobFilters filters={filters} onFiltersChange={setFilters} />
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mockJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>

          <div className="text-center mt-8">
            <Button variant="outline" size="lg">
              더 많은 채용공고 보기
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}
