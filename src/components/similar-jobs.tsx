"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles, MapPin, DollarSign } from "lucide-react"
import Link from "next/link"

interface SimilarJob {
  id: string
  title: string
  company: string
  location: string
  salary: number
  jobType: string
}

interface SimilarJobsProps {
  jobId: string
}

export function SimilarJobs({ jobId }: SimilarJobsProps) {
  const [similarJobs, setSimilarJobs] = useState<SimilarJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSimilarJobs()
  }, [jobId])

  const fetchSimilarJobs = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/similar`)
      if (response.ok) {
        const data = await response.json()
        setSimilarJobs(data.similarJobs)
      }
    } catch (error) {
      console.error("Failed to fetch similar jobs:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            유사한 채용공고
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (similarJobs.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          유사한 채용공고
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {similarJobs.map((job) => (
            <div key={job.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{job.title}</h4>
                    <p className="text-sm text-muted-foreground">{job.company}</p>
                  </div>
                  <Badge variant="outline">{job.jobType}</Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {job.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {(job.salary / 10000).toLocaleString()}만원
                  </div>
                </div>

                <Button asChild variant="outline" size="sm" className="w-full bg-transparent">
                  <Link href={`/jobs/${job.id}`}>자세히 보기</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
