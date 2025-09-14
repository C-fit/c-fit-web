"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles, TrendingUp, Target, Brain } from "lucide-react"
import Link from "next/link"

interface JobRecommendation {
  id: string
  title: string
  company: string
  location: string
  salary: number
  aiScore: number
  aiReasons: string[]
  compatibility: number
}

export function AIRecommendations() {
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecommendations()
  }, [])

  const fetchRecommendations = async () => {
    try {
      const response = await fetch("/api/recommendations")
      if (response.ok) {
        const data = await response.json()
        setRecommendations(data.recommendations)
      }
    } catch (error) {
      console.error("Failed to fetch recommendations:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">AI 맞춤 추천</h2>
      </div>

      <div className="space-y-4">
        {recommendations.map((job) => (
          <Card key={job.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{job.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    <Brain className="h-3 w-3 mr-1" />
                    AI 매칭 {Math.round(job.aiScore)}%
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{job.location}</span>
                  <span>연봉 {(job.salary / 10000).toLocaleString()}만원</span>
                </div>

                {job.aiReasons.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <Target className="h-4 w-4 text-primary" />
                      AI 추천 이유
                    </div>
                    <div className="space-y-1">
                      {job.aiReasons.map((reason, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1 h-1 bg-primary rounded-full"></div>
                          {reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600 font-medium">적합도 {job.compatibility}%</span>
                  </div>
                  <Button asChild size="sm">
                    <Link href={`/jobs/${job.id}`}>자세히 보기</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
