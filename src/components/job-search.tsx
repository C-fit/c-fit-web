"use client"

import { useState } from "react"
import { Search, MapPin, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"

interface JobSearchProps {
  onSearch?: (query: string, location?: string, jobType?: string) => void
}

export function JobSearch({ onSearch }: JobSearchProps) {
  const [query, setQuery] = useState("")
  const [location, setLocation] = useState("all")
  const [jobType, setJobType] = useState("all")

  const handleSearch = () => {
    onSearch?.(query, location === "all" ? undefined : location, jobType === "all" ? undefined : jobType)
  }

  const locations = [
    "서울특별시",
    "경기도",
    "인천광역시",
    "부산광역시",
    "대구광역시",
    "광주광역시",
    "대전광역시",
    "울산광역시",
    "세종특별자치시",
    "강원도",
    "충청북도",
    "충청남도",
    "전라북도",
    "전라남도",
    "경상북도",
    "경상남도",
    "제주특별자치도",
  ]

  const jobTypes = [
    { value: "full-time", label: "정규직" },
    { value: "part-time", label: "계약직" },
    { value: "contract", label: "프리랜서" },
    { value: "internship", label: "인턴십" },
  ]

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Query */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="직무, 회사명, 기술 스택 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-12"
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>

          {/* Location */}
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="h-12">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="지역" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 지역</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Job Type */}
          <Select value={jobType} onValueChange={setJobType}>
            <SelectTrigger className="h-12">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="고용형태" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {jobTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSearch} size="lg" className="w-full md:w-auto mt-4 md:mt-0 md:ml-4">
          검색
        </Button>
      </CardContent>
    </Card>
  )
}
