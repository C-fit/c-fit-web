/*
  Warnings:

  - You are about to drop the column `techStacks` on the `JobPosting` table. All the data in the column will be lost.
  - You are about to drop the column `resume` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."JobPosting" DROP COLUMN "techStacks";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "resume";

-- CreateTable
CREATE TABLE "public"."ResumeFile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResumeFile_userId_createdAt_idx" ON "public"."ResumeFile"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."ResumeFile" ADD CONSTRAINT "ResumeFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;