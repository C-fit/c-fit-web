/*
  Warnings:

  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."JobPosting" ADD COLUMN     "careerYears" INTEGER[],
ADD COLUMN     "deadline" TEXT,
ADD COLUMN     "jobName" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "techStacks" TEXT[],
ALTER COLUMN "companyName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "password",
ADD COLUMN     "passwordHash" TEXT NOT NULL;
