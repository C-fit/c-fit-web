"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Edit, Save, Plus, X, Sparkles, User, Briefcase, GraduationCap, Award } from "lucide-react"
import { useRouter } from "next/navigation"

interface Resume {
  id: string
  name: string
  email: string
  phone: string
  summary: string
  skills: string[]
  experience: Array<{
    company: string
    position: string
    duration: string
    description: string
  }>
  education: Array<{
    school: string
    degree: string
    duration: string
  }>
  updatedAt: Date
}

export default function ResumePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [resume, setResume] = useState<Resume | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [newSkill, setNewSkill] = useState("")
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    } else if (user) {
      loadResume()
    }
  }, [user, loading, router])

  const loadResume = async () => {
    // Mock resume data - in real app, fetch from API
    const mockResume: Resume = {
      id: "1",
      name: user?.name || "",
      email: user?.email || "",
      phone: "010-1234-5678",
      summary:
        "3년차 프론트엔드 개발자로 React, TypeScript를 활용한 웹 애플리케이션 개발 경험이 있습니다. 사용자 경험을 중시하며, 최신 기술 트렌드에 관심이 많습니다.",
      skills: ["React", "TypeScript", "JavaScript", "HTML", "CSS", "Next.js", "Node.js"],
      experience: [
        {
          company: "스타트업 A",
          position: "프론트엔드 개발자",
          duration: "2022.03 - 현재",
          description: "React와 TypeScript를 활용한 웹 애플리케이션 개발 및 유지보수",
        },
        {
          company: "IT 회사 B",
          position: "주니어 개발자",
          duration: "2021.01 - 2022.02",
          description: "JavaScript와 HTML/CSS를 활용한 웹사이트 개발",
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
    setResume(mockResume)

    // Mock AI analysis
    setTimeout(() => {
      setAiAnalysis(
        "AI 분석 결과: 프론트엔드 개발 분야에서 강점을 보이고 있습니다. React와 TypeScript 경험이 풍부하여 대부분의 프론트엔드 포지션에 적합합니다. 백엔드 기술 스택을 추가하면 풀스택 개발자로의 전환도 가능할 것 같습니다.",
      )
    }, 1500)
  }

  const handleSave = async () => {
    // In real app, save to API
    console.log("Saving resume:", resume)
    setIsEditing(false)
  }

  const addSkill = () => {
    if (newSkill.trim() && resume) {
      setResume({
        ...resume,
        skills: [...resume.skills, newSkill.trim()],
      })
      setNewSkill("")
    }
  }

  const removeSkill = (skillToRemove: string) => {
    if (resume) {
      setResume({
        ...resume,
        skills: resume.skills.filter((skill) => skill !== skillToRemove),
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">이력서 관리</h1>
              <p className="text-muted-foreground">이력서를 관리하고 AI 분석을 받아보세요</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                파일 업로드
              </Button>
              {isEditing ? (
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  저장
                </Button>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  편집
                </Button>
              )}
            </div>
          </div>

          {/* AI Analysis */}
          {aiAnalysis && (
            <Alert className="border-primary/20 bg-primary/5">
              <Sparkles className="h-4 w-4 text-primary" />
              <AlertDescription className="text-primary">
                <strong>AI 이력서 분석</strong>
                <br />
                {aiAnalysis}
              </AlertDescription>
            </Alert>
          )}

          {resume && (
            <div className="grid gap-6">
              {/* Personal Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    기본 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">이름</label>
                      {isEditing ? (
                        <Input value={resume.name} onChange={(e) => setResume({ ...resume, name: e.target.value })} />
                      ) : (
                        <p className="text-lg font-semibold">{resume.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">이메일</label>
                      {isEditing ? (
                        <Input value={resume.email} onChange={(e) => setResume({ ...resume, email: e.target.value })} />
                      ) : (
                        <p>{resume.email}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">전화번호</label>
                    {isEditing ? (
                      <Input value={resume.phone} onChange={(e) => setResume({ ...resume, phone: e.target.value })} />
                    ) : (
                      <p>{resume.phone}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">자기소개</label>
                    {isEditing ? (
                      <Textarea
                        value={resume.summary}
                        onChange={(e) => setResume({ ...resume, summary: e.target.value })}
                        rows={4}
                      />
                    ) : (
                      <p className="text-sm leading-relaxed">{resume.summary}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Skills */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    기술 스택
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {resume.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-sm py-1 px-3">
                          {skill}
                          {isEditing && (
                            <button onClick={() => removeSkill(skill)} className="ml-2 hover:text-destructive">
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                    {isEditing && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="새 기술 추가"
                          value={newSkill}
                          onChange={(e) => setNewSkill(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && addSkill()}
                        />
                        <Button onClick={addSkill} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Experience */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    경력
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {resume.experience.map((exp, index) => (
                      <div key={index}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{exp.position}</h4>
                            <p className="text-muted-foreground">{exp.company}</p>
                          </div>
                          <Badge variant="outline">{exp.duration}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{exp.description}</p>
                        {index < resume.experience.length - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Education */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    학력
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {resume.education.map((edu, index) => (
                      <div key={index} className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{edu.degree}</h4>
                          <p className="text-muted-foreground">{edu.school}</p>
                        </div>
                        <Badge variant="outline">{edu.duration}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
