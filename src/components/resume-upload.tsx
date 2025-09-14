"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react"

interface ResumeUploadProps {
  onUploadComplete?: (resumeData: any) => void
}

export function ResumeUpload({ onUploadComplete }: ResumeUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
  const [uploadMessage, setUploadMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]

    if (!allowedTypes.includes(file.type)) {
      setUploadStatus("error")
      setUploadMessage("PDF, DOC, DOCX 파일만 업로드 가능합니다.")
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setUploadStatus("error")
      setUploadMessage("파일 크기는 5MB 이하여야 합니다.")
      return
    }

    setUploading(true)
    setUploadStatus("idle")

    try {
      // Mock file upload and parsing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Mock parsed resume data
      const parsedData = {
        name: "홍길동",
        email: "hong@example.com",
        phone: "010-1234-5678",
        summary: "파일에서 추출된 자기소개입니다.",
        skills: ["React", "JavaScript", "TypeScript"],
        experience: [
          {
            company: "추출된 회사명",
            position: "추출된 직책",
            duration: "2022.01 - 현재",
            description: "파일에서 추출된 업무 내용입니다.",
          },
        ],
        education: [
          {
            school: "추출된 학교명",
            degree: "추출된 학위",
            duration: "2018.03 - 2022.02",
          },
        ],
      }

      setUploadStatus("success")
      setUploadMessage("이력서가 성공적으로 업로드되고 분석되었습니다.")
      onUploadComplete?.(parsedData)
    } catch (error) {
      setUploadStatus("error")
      setUploadMessage("파일 업로드 중 오류가 발생했습니다.")
    } finally {
      setUploading(false)
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          이력서 파일 업로드
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <div className="space-y-2">
            <p className="text-lg font-medium">이력서 파일을 업로드하세요</p>
            <p className="text-sm text-muted-foreground">PDF, DOC, DOCX 파일을 지원합니다 (최대 5MB)</p>
          </div>
          <Button onClick={triggerFileSelect} disabled={uploading} className="mt-4">
            {uploading ? "업로드 중..." : "파일 선택"}
          </Button>
        </div>

        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleFileSelect} className="hidden" />

        {uploadStatus !== "idle" && (
          <Alert className={uploadStatus === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {uploadStatus === "success" ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={uploadStatus === "success" ? "text-green-800" : "text-red-800"}>
              {uploadMessage}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• AI가 자동으로 이력서 내용을 분석하고 구조화합니다</p>
          <p>• 업로드된 파일은 안전하게 암호화되어 저장됩니다</p>
          <p>• 언제든지 수정하거나 삭제할 수 있습니다</p>
        </div>
      </CardContent>
    </Card>
  )
}
