// Job scraping utilities and functions
export interface ScrapedJob {
  title: string
  company: string
  location: string
  salary?: string
  description: string
  requirements?: string
  jobType: string
  sourceUrl: string
  sourceSite: string
  postedDate?: Date
}

export interface ScrapingTarget {
  id: string
  name: string
  baseUrl: string
  selectors: {
    jobList: string
    title: string
    company: string
    location: string
    salary?: string
    description: string
    requirements?: string
    jobType?: string
    link: string
  }
  enabled: boolean
}

// Mock scraping targets - in real app, these would be configurable
export const scrapingTargets: ScrapingTarget[] = [
  {
    id: "jobkorea",
    name: "잡코리아",
    baseUrl: "https://www.jobkorea.co.kr",
    selectors: {
      jobList: ".list-post",
      title: ".post-list-corp-name a",
      company: ".post-list-corp",
      location: ".post-list-info .location",
      salary: ".post-list-info .salary",
      description: ".post-content",
      requirements: ".post-requirements",
      jobType: ".employment-type",
      link: "a.title",
    },
    enabled: true,
  },
  {
    id: "saramin",
    name: "사람인",
    baseUrl: "https://www.saramin.co.kr",
    selectors: {
      jobList: ".item_recruit",
      title: ".job_tit a",
      company: ".corp_name a",
      location: ".job_condition .job_day",
      salary: ".job_condition .job_sector",
      description: ".job_summary",
      link: ".job_tit a",
    },
    enabled: true,
  },
  {
    id: "wanted",
    name: "원티드",
    baseUrl: "https://www.wanted.co.kr",
    selectors: {
      jobList: '[data-cy="job-card"]',
      title: '[data-cy="job-card-title"]',
      company: '[data-cy="job-card-company"]',
      location: '[data-cy="job-card-location"]',
      description: '[data-cy="job-card-description"]',
      link: "a",
    },
    enabled: true,
  },
]

// Mock scraping function - in real app, use actual web scraping
export async function scrapeJobs(targetId: string, limit = 50): Promise<ScrapedJob[]> {
  const target = scrapingTargets.find((t) => t.id === targetId)
  if (!target) {
    throw new Error(`Scraping target ${targetId} not found`)
  }

  // Simulate scraping delay
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Mock scraped data
  const mockJobs: ScrapedJob[] = [
    {
      title: "시니어 프론트엔드 개발자",
      company: "네이버",
      location: "서울 강남구",
      salary: "연봉 6,000~8,000만원",
      description: "React, TypeScript를 활용한 대규모 웹 서비스 개발",
      requirements: "React 5년 이상, TypeScript 3년 이상",
      jobType: "정규직",
      sourceUrl: `${target.baseUrl}/job/12345`,
      sourceSite: target.name,
      postedDate: new Date(),
    },
    {
      title: "백엔드 개발자",
      company: "카카오",
      location: "경기 성남시",
      salary: "연봉 5,500~7,500만원",
      description: "Node.js, Python을 활용한 API 서버 개발",
      requirements: "Node.js 3년 이상, Python 2년 이상",
      jobType: "정규직",
      sourceUrl: `${target.baseUrl}/job/12346`,
      sourceSite: target.name,
      postedDate: new Date(),
    },
    {
      title: "DevOps 엔지니어",
      company: "라인",
      location: "서울 강남구",
      salary: "연봉 7,000~9,000만원",
      description: "AWS, Kubernetes를 활용한 인프라 관리",
      requirements: "AWS 3년 이상, Kubernetes 2년 이상",
      jobType: "정규직",
      sourceUrl: `${target.baseUrl}/job/12347`,
      sourceSite: target.name,
      postedDate: new Date(),
    },
  ]

  return mockJobs.slice(0, limit)
}

// Job data normalization and processing
export function normalizeJobData(scrapedJob: ScrapedJob): any {
  return {
    title: scrapedJob.title.trim(),
    companyName: scrapedJob.company.trim(),
    location: scrapedJob.location.trim(),
    salary: scrapedJob.salary?.trim(),
    description: scrapedJob.description.trim(),
    requirements: scrapedJob.requirements?.trim(),
    jobType: normalizeJobType(scrapedJob.jobType),
    sourceUrl: scrapedJob.sourceUrl,
    sourceSite: scrapedJob.sourceSite,
    techStack: extractTechStack(scrapedJob.description + " " + (scrapedJob.requirements || "")),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function normalizeJobType(jobType: string): string {
  const normalized = jobType.toLowerCase().trim()
  if (normalized.includes("정규") || normalized.includes("full")) return "full-time"
  if (normalized.includes("계약") || normalized.includes("contract")) return "contract"
  if (normalized.includes("인턴") || normalized.includes("intern")) return "internship"
  if (normalized.includes("파트") || normalized.includes("part")) return "part-time"
  return "full-time"
}

function extractTechStack(text: string): string[] {
  const techKeywords = [
    "React",
    "Vue",
    "Angular",
    "JavaScript",
    "TypeScript",
    "Node.js",
    "Python",
    "Java",
    "Spring",
    "Django",
    "Flask",
    "Express",
    "Next.js",
    "Nuxt.js",
    "GraphQL",
    "REST",
    "MySQL",
    "PostgreSQL",
    "MongoDB",
    "Redis",
    "AWS",
    "GCP",
    "Azure",
    "Docker",
    "Kubernetes",
    "Git",
    "Jenkins",
    "CI/CD",
    "HTML",
    "CSS",
    "Sass",
    "Tailwind",
  ]

  const foundTech = techKeywords.filter((tech) => text.toLowerCase().includes(tech.toLowerCase()))

  return [...new Set(foundTech)] // Remove duplicates
}

// Deduplication logic
export function isDuplicateJob(newJob: any, existingJobs: any[]): boolean {
  return existingJobs.some(
    (existing) =>
      existing.title.toLowerCase() === newJob.title.toLowerCase() &&
      existing.companyName.toLowerCase() === newJob.companyName.toLowerCase() &&
      existing.location === newJob.location,
  )
}
