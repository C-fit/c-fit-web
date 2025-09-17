import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { scrapeJobs, normalizeJobData, isDuplicateJob } from "@/lib/scraper"

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Check if user has admin privileges (in real app)
    // if (!user.isAdmin) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    // }

    const { targetId, limit = 50 } = await request.json()

    if (!targetId) {
      return NextResponse.json({ error: "Target ID is required" }, { status: 400 })
    }

    // Perform scraping
    const scrapedJobs = await scrapeJobs(targetId, limit)

    // Normalize job data
    const normalizedJobs = scrapedJobs.map(normalizeJobData)

    // In real app, save to database and check for duplicates
    const existingJobs: any[] = [] // Fetch from database
    const newJobs = normalizedJobs.filter((job) => !isDuplicateJob(job, existingJobs))

    // Mock database save
    console.log(`Saving ${newJobs.length} new jobs from ${targetId}`)

    return NextResponse.json({
      success: true,
      totalScraped: scrapedJobs.length,
      newJobs: newJobs.length,
      duplicates: normalizedJobs.length - newJobs.length,
      jobs: newJobs,
    })
  } catch (error) {
    console.error("Scraping error:", error)
    return NextResponse.json(
      {
        error: "Scraping failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Mock scraping statistics
    const stats = {
      totalJobs: 1250,
      todayJobs: 45,
      activeTargets: 3,
      lastScrapeTime: new Date(),
      successRate: 95.2,
      averageJobsPerScrape: 38,
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error("Stats fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
