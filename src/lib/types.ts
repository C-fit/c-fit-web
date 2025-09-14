export interface JobPosting {
  id: string
  title: string
  companyName: string
  description: string
  requirements: string
  preferred?: string
  location?: string
  salary?: string
  jobType?: string
  techStack: string[]
  sourceUrl: string
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  email: string
  name: string
  resume?: string
  createdAt: Date
  updatedAt: Date
}

export interface SavedJob {
  id: string
  userId: string
  jobPostingId: string
  createdAt: Date
  user: User
  jobPosting: JobPosting
}

export interface JobSearchFilters {
  query?: string
  location?: string
  jobType?: string
  techStack?: string[]
  experienceLevel?: string
}

export interface AIJobMatch {
  jobPosting: JobPosting
  matchScore: number
  matchReasons: string[]
}
