// components/jobs/job-card.tsx
"use client"

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bookmark, ExternalLink } from "lucide-react"
import { useState } from "react"

type Item = {
  id: string
  url: string
  companyName?: string | null
  title: string
  jobName?: string | null
  experienceLevel?: string | null
  careerYears: number[]
  location?: string | null
  deadline?: string | null
  saved?: boolean
}

export function JobCard({ item, onSavedChange }: { item: Item; onSavedChange?: (id: string, saved: boolean) => void }) {
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(!!item.saved)

  async function toggleSave() {
    setPending(true)
    try {
      const res = await fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: item.id, save: !saved }),
      })
      if (!res.ok) throw new Error("save failed")
      const data = await res.json()
      setSaved(!!data.saved)
      onSavedChange?.(item.id, !!data.saved)
    } catch (e) {
      console.error(e)
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg leading-tight">{item.title}</CardTitle>
        <div className="text-sm text-muted-foreground">{item.companyName ?? "-"}</div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        <div className="text-sm">{item.jobName ?? ""}</div>
        <div className="text-xs text-muted-foreground">
          경력: {item.experienceLevel ?? "경력무관"} · 연차: {Math.min(...item.careerYears)}~{Math.max(...item.careerYears)}년
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 justify-end">
        <Button variant="ghost" size="icon" onClick={toggleSave} disabled={pending} title={saved ? "저장 해제" : "저장"}>
          <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
        </Button>
        <a href={item.url} target="_blank" rel="noreferrer">
          <Button variant="secondary" size="sm">
            상세보기 <ExternalLink className="h-4 w-4 ml-1" />
          </Button>
        </a>
      </CardFooter>
    </Card>
  )
}
