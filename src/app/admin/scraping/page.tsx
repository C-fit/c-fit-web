"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Play, RefreshCw, Settings, Clock, CheckCircle, AlertCircle, BarChart3 } from "lucide-react"
import { scrapingTargets, scrapeJobs, normalizeJobData } from "@/lib/scraper"

interface ScrapingJob {
  id: string
  targetId: string
  status: "idle" | "running" | "completed" | "error"
  progress: number
  jobsFound: number
  jobsProcessed: number
  startTime?: Date
  endTime?: Date
  error?: string
}

export default function ScrapingAdminPage() {
  const [scrapingJobs, setScrapingJobs] = useState<ScrapingJob[]>([])
  const [targets, setTargets] = useState(scrapingTargets)
  const [isAutoScraping, setIsAutoScraping] = useState(false)

  useEffect(() => {
    // Initialize scraping jobs
    const initialJobs = scrapingTargets.map((target) => ({
      id: `job-${target.id}-${Date.now()}`,
      targetId: target.id,
      status: "idle" as const,
      progress: 0,
      jobsFound: 0,
      jobsProcessed: 0,
    }))
    setScrapingJobs(initialJobs)
  }, [])

  const startScraping = async (targetId: string) => {
    const jobIndex = scrapingJobs.findIndex((job) => job.targetId === targetId && job.status === "idle")
    if (jobIndex === -1) return

    // Update job status to running
    setScrapingJobs((prev) =>
      prev.map((job, index) =>
        index === jobIndex ? { ...job, status: "running", progress: 0, startTime: new Date() } : job,
      ),
    )

    try {
      // Simulate scraping progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200))
        setScrapingJobs((prev) =>
          prev.map((job, index) =>
            index === jobIndex ? { ...job, progress, jobsFound: Math.floor(progress / 10) * 5 } : job,
          ),
        )
      }

      // Perform actual scraping
      const scrapedJobs = await scrapeJobs(targetId, 50)
      const processedJobs = scrapedJobs.map(normalizeJobData)

      // Update job status to completed
      setScrapingJobs((prev) =>
        prev.map((job, index) =>
          index === jobIndex
            ? {
                ...job,
                status: "completed",
                progress: 100,
                jobsFound: scrapedJobs.length,
                jobsProcessed: processedJobs.length,
                endTime: new Date(),
              }
            : job,
        ),
      )
    } catch (error) {
      setScrapingJobs((prev) =>
        prev.map((job, index) =>
          index === jobIndex
            ? {
                ...job,
                status: "error",
                error: error instanceof Error ? error.message : "Unknown error",
                endTime: new Date(),
              }
            : job,
        ),
      )
    }
  }

  const toggleTarget = (targetId: string) => {
    setTargets((prev) =>
      prev.map((target) => (target.id === targetId ? { ...target, enabled: !target.enabled } : target)),
    )
  }

  const startAllScraping = async () => {
    const enabledTargets = targets.filter((t) => t.enabled)
    for (const target of enabledTargets) {
      await startScraping(target.id)
      // Add delay between scraping jobs
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  const resetJobs = () => {
    setScrapingJobs((prev) =>
      prev.map((job) => ({
        ...job,
        status: "idle" as const,
        progress: 0,
        jobsFound: 0,
        jobsProcessed: 0,
        startTime: undefined,
        endTime: undefined,
        error: undefined,
      })),
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      idle: "secondary",
      running: "default",
      completed: "default",
      error: "destructive",
    } as const

    const labels = {
      idle: "대기중",
      running: "실행중",
      completed: "완료",
      error: "오류",
    }

    return <Badge variant={variants[status as keyof typeof variants]}>{labels[status as keyof typeof labels]}</Badge>
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">채용공고 수집 관리</h1>
              <p className="text-muted-foreground">다양한 채용 사이트에서 공고를 자동으로 수집합니다</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={resetJobs} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                초기화
              </Button>
              <Button onClick={startAllScraping}>
                <Play className="h-4 w-4 mr-2" />
                전체 실행
              </Button>
            </div>
          </div>

          {/* Auto Scraping Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                자동 수집 설정
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">자동 수집 활성화</p>
                  <p className="text-sm text-muted-foreground">매일 정해진 시간에 자동으로 채용공고를 수집합니다</p>
                </div>
                <Switch checked={isAutoScraping} onCheckedChange={setIsAutoScraping} />
              </div>
              {isAutoScraping && (
                <Alert className="mt-4">
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    자동 수집이 활성화되었습니다. 매일 오전 6시와 오후 6시에 실행됩니다.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Scraping Targets */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {targets.map((target) => {
              const job = scrapingJobs.find((j) => j.targetId === target.id)
              return (
                <Card key={target.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{target.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        {job && getStatusIcon(job.status)}
                        {job && getStatusBadge(job.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">수집 활성화</span>
                      <Switch checked={target.enabled} onCheckedChange={() => toggleTarget(target.id)} />
                    </div>

                    {job && job.status === "running" && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>진행률</span>
                          <span>{job.progress}%</span>
                        </div>
                        <Progress value={job.progress} />
                      </div>
                    )}

                    {job && (job.status === "completed" || job.status === "error") && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>발견된 공고</span>
                          <span>{job.jobsFound}개</span>
                        </div>
                        <div className="flex justify-between">
                          <span>처리된 공고</span>
                          <span>{job.jobsProcessed}개</span>
                        </div>
                        {job.startTime && job.endTime && (
                          <div className="flex justify-between">
                            <span>소요 시간</span>
                            <span>{Math.round((job.endTime.getTime() - job.startTime.getTime()) / 1000)}초</span>
                          </div>
                        )}
                      </div>
                    )}

                    {job && job.status === "error" && job.error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">{job.error}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      onClick={() => startScraping(target.id)}
                      disabled={!target.enabled || (job && job.status === "running")}
                      className="w-full"
                      size="sm"
                    >
                      {job && job.status === "running" ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          수집 중...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          수집 시작
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                수집 통계
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {scrapingJobs.reduce((sum, job) => sum + job.jobsFound, 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">총 발견 공고</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {scrapingJobs.reduce((sum, job) => sum + job.jobsProcessed, 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">처리된 공고</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {scrapingJobs.filter((job) => job.status === "completed").length}
                  </div>
                  <p className="text-sm text-muted-foreground">완료된 작업</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {scrapingJobs.filter((job) => job.status === "error").length}
                  </div>
                  <p className="text-sm text-muted-foreground">실패한 작업</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
