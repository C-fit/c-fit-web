"use client"

import { useState } from "react"
import { Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { JobSearchFilters } from "@/lib/types"

interface JobFiltersProps {
  filters: JobSearchFilters
  onFiltersChange: (filters: JobSearchFilters) => void
}

export function JobFilters({ filters, onFiltersChange }: JobFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)



  const jobTypeOptions = [
    { value: "full-time", label: "정규직" },
    { value: "part-time", label: "계약직" },
    { value: "contract", label: "프리랜서" },
    { value: "internship", label: "인턴십" },
  ]

  const experienceLevelOptions = [
    { value: "entry", label: "신입" },
    { value: "junior", label: "주니어 (1-3년)" },
    { value: "mid", label: "미드레벨 (3-5년)" },
    { value: "senior", label: "시니어 (5년+)" },
    { value: "lead", label: "리드/매니저" },
  ]

  const updateFilters = (key: keyof JobSearchFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  const activeFiltersCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="flex items-center gap-2">
      {/* Desktop Filters */}
      <div className="hidden md:flex items-center gap-2">
        <Select value={filters.jobType || ""} onValueChange={(value) => updateFilters("jobType", value || undefined)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="고용형태" />
          </SelectTrigger>
          <SelectContent>
            {jobTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.experienceLevel || ""}
          onValueChange={(value) => updateFilters("experienceLevel", value || undefined)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="경력" />
          </SelectTrigger>
          <SelectContent>
            {experienceLevelOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile Filter Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="md:hidden bg-transparent">
            <Filter className="h-4 w-4 mr-2" />
            필터
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>필터</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <label className="text-sm font-medium mb-2 block">고용형태</label>
              <Select
                value={filters.jobType || ""}
                onValueChange={(value) => updateFilters("jobType", value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {jobTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">경력</label>
              <Select
                value={filters.experienceLevel || ""}
                onValueChange={(value) => updateFilters("experienceLevel", value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {experienceLevelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          초기화
        </Button>
      )}

      {/* Active Filters Display */}
      <div className="hidden md:flex items-center gap-1">
        {filters.jobType && (
          <Badge variant="secondary" className="text-xs">
            {jobTypeOptions.find((opt) => opt.value === filters.jobType)?.label}
            <button onClick={() => updateFilters("jobType", undefined)} className="ml-1 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {filters.experienceLevel && (
          <Badge variant="secondary" className="text-xs">
            {experienceLevelOptions.find((opt) => opt.value === filters.experienceLevel)?.label}
            <button onClick={() => updateFilters("experienceLevel", undefined)} className="ml-1 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
      </div>
    </div>
  )
}
