// app/api/saved/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { jobId, save } = await req.json()
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 })

  if (save) {
    await prisma.savedJob.upsert({
      where: { userId_jobPostingId: { userId: session.userId, jobPostingId: jobId } },
      update: {},
      create: { userId: session.userId, jobPostingId: jobId }
    })
  } else {
    await prisma.savedJob.deleteMany({
      where: { userId: session.userId, jobPostingId: jobId }
    })
  }
  return NextResponse.json({ ok: true, saved: !!save })
}
