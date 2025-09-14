import type { JobPosting } from "./types"

// Mock AI recommendation system using similarity scoring
export interface RecommendationScore {
  jobId: string
  score: number
  reasons: string[]
  compatibility: number
}

export interface UserProfile {
  skills: string[]
  experience: string[]
  preferences: {
    location?: string
    salary?: number
    jobType?: string
    industry?: string
  }
}

// Simulate vector similarity using job attributes
export function calculateJobSimilarity(job1: JobPosting, job2: JobPosting): number {
  let similarity = 0
  let factors = 0

  // Company similarity
  if (job1.company === job2.company) {
    similarity += 0.3
  }
  factors += 0.3

  // Location similarity
  if (job1.location === job2.location) {
    similarity += 0.2
  }
  factors += 0.2

  // Job type similarity
  if (job1.jobType === job2.jobType) {
    similarity += 0.2
  }
  factors += 0.2

  // Salary range similarity
  const salaryDiff = Math.abs((job1.salary || 0) - (job2.salary || 0))
  const salarySimilarity = Math.max(0, 1 - salaryDiff / 100000000) // Normalize by 100M won
  similarity += salarySimilarity * 0.3
  factors += 0.3

  return similarity / factors
}

// Mock resume-job compatibility analysis
export function analyzeResumeJobCompatibility(
  userProfile: UserProfile,
  job: JobPosting,
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // Skills matching
  const userSkills = userProfile.skills.map((s) => s.toLowerCase())
  const jobRequirements = job.requirements?.toLowerCase() || ""

  const matchingSkills = userSkills.filter((skill) => jobRequirements.includes(skill))

  if (matchingSkills.length > 0) {
    const skillScore = Math.min(matchingSkills.length / userSkills.length, 1) * 40
    score += skillScore
    reasons.push(`${matchingSkills.length}개의 기술 스택이 일치합니다`)
  }

  // Experience matching
  if (userProfile.experience.length > 0) {
    const expScore = Math.min(userProfile.experience.length / 5, 1) * 30
    score += expScore
    reasons.push(`경력 수준이 적합합니다`)
  }

  // Location preference
  if (userProfile.preferences.location && job.location.includes(userProfile.preferences.location)) {
    score += 15
    reasons.push("선호 지역과 일치합니다")
  }

  // Salary preference
  if (userProfile.preferences.salary && job.salary) {
    const salaryMatch = job.salary >= userProfile.preferences.salary
    if (salaryMatch) {
      score += 15
      reasons.push("희망 연봉 조건을 만족합니다")
    }
  }

  return { score: Math.min(score, 100), reasons }
}

// Generate personalized job recommendations
export function generateJobRecommendations(
  userProfile: UserProfile,
  allJobs: JobPosting[],
  limit = 10,
): RecommendationScore[] {
  const recommendations = allJobs.map((job) => {
    const compatibility = analyzeResumeJobCompatibility(userProfile, job)

    // Add randomness to simulate AI variability
    const aiBoost = Math.random() * 20 - 10 // -10 to +10
    const finalScore = Math.max(0, Math.min(100, compatibility.score + aiBoost))

    return {
      jobId: job.id,
      score: finalScore,
      reasons: compatibility.reasons,
      compatibility: compatibility.score,
    }
  })

  return recommendations.sort((a, b) => b.score - a.score).slice(0, limit)
}

// Find similar jobs using mock vector similarity
export function findSimilarJobs(targetJob: JobPosting, allJobs: JobPosting[], limit = 5): JobPosting[] {
  const similarities = allJobs
    .filter((job) => job.id !== targetJob.id)
    .map((job) => ({
      job,
      similarity: calculateJobSimilarity(targetJob, job),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)

  return similarities.map((item) => item.job)
}

// Mock AI job description enhancement
export function enhanceJobDescription(job: JobPosting): string {
  const enhancements = [
    "🤖 AI 분석: 이 포지션은 현재 시장에서 높은 수요를 보이고 있습니다.",
    "📈 성장 가능성: 해당 분야는 향후 3년간 25% 성장이 예상됩니다.",
    "💡 추천 이유: 귀하의 기술 스택과 90% 일치합니다.",
    "🎯 적합도: 귀하의 경력 수준에 매우 적합한 포지션입니다.",
  ]

  const randomEnhancement = enhancements[Math.floor(Math.random() * enhancements.length)]
  return `${job.description}\n\n${randomEnhancement}`
}
