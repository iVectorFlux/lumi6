/*
  Warnings:

  - The `role` column on the `Admin` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Candidate` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `CandidateTest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `candidateEmail` on the `ProficiencyTest` table. All the data in the column will be lost.
  - You are about to drop the column `candidateName` on the `ProficiencyTest` table. All the data in the column will be lost.
  - The `status` column on the `ProficiencyTest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `candidateEmail` on the `WritingTest` table. All the data in the column will be lost.
  - You are about to drop the column `candidateName` on the `WritingTest` table. All the data in the column will be lost.
  - The `status` column on the `WritingTest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `candidateId` to the `ProficiencyTest` table without a default value. This is not possible if the table is not empty.
  - Made the column `companyId` on table `ProficiencyTest` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `candidateId` to the `WritingTest` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Create new enums
CREATE TYPE "AdminRole" AS ENUM ('superadmin', 'companyadmin', 'companymanager');

-- Step 2: Drop existing foreign key constraints
ALTER TABLE "Admin" DROP CONSTRAINT "Admin_companyId_fkey";
ALTER TABLE "Candidate" DROP CONSTRAINT "Candidate_companyId_fkey";
ALTER TABLE "CandidateTest" DROP CONSTRAINT "CandidateTest_candidateId_fkey";
ALTER TABLE "CandidateTest" DROP CONSTRAINT "CandidateTest_testId_fkey";
ALTER TABLE "CandidateTestQuestion" DROP CONSTRAINT "CandidateTestQuestion_candidateTestId_fkey";
ALTER TABLE "CandidateTestQuestion" DROP CONSTRAINT "CandidateTestQuestion_questionId_fkey";
ALTER TABLE "EQQuestion" DROP CONSTRAINT "EQQuestion_companyId_fkey";
ALTER TABLE "EQResponse" DROP CONSTRAINT "EQResponse_questionId_fkey";
ALTER TABLE "EQResponse" DROP CONSTRAINT "EQResponse_resultId_fkey";
ALTER TABLE "EQResult" DROP CONSTRAINT "EQResult_candidateId_fkey";
ALTER TABLE "EQResult" DROP CONSTRAINT "EQResult_testId_fkey";
ALTER TABLE "EQTest" DROP CONSTRAINT "EQTest_companyId_fkey";
ALTER TABLE "GlobalProficiencyQuestion" DROP CONSTRAINT "GlobalProficiencyQuestion_companyId_fkey";
ALTER TABLE "Question" DROP CONSTRAINT "Question_adminId_fkey";
ALTER TABLE "Response" DROP CONSTRAINT "Response_candidateTestId_fkey";
ALTER TABLE "Response" DROP CONSTRAINT "Response_questionId_fkey";
ALTER TABLE "Test" DROP CONSTRAINT "Test_adminId_fkey";
ALTER TABLE "Test" DROP CONSTRAINT "Test_companyId_fkey";
ALTER TABLE "TestQuestion" DROP CONSTRAINT "TestQuestion_questionId_fkey";
ALTER TABLE "TestQuestion" DROP CONSTRAINT "TestQuestion_testId_fkey";
ALTER TABLE "TestResult" DROP CONSTRAINT "TestResult_candidateTestId_fkey";
ALTER TABLE "WritingQuestion" DROP CONSTRAINT "WritingQuestion_companyId_fkey";
ALTER TABLE "WritingResponse" DROP CONSTRAINT "WritingResponse_questionId_fkey";
ALTER TABLE "WritingResponse" DROP CONSTRAINT "WritingResponse_testId_fkey";
ALTER TABLE "WritingResult" DROP CONSTRAINT "WritingResult_testId_fkey";
ALTER TABLE "WritingTest" DROP CONSTRAINT "WritingTest_companyId_fkey";

-- Step 3: Add temporary candidateId columns
ALTER TABLE "ProficiencyTest" ADD COLUMN "candidateId_temp" TEXT;
ALTER TABLE "WritingTest" ADD COLUMN "candidateId_temp" TEXT;

-- Step 4: Update candidateId_temp with actual candidate IDs
UPDATE "ProficiencyTest" 
SET "candidateId_temp" = c.id
FROM "Candidate" c
WHERE "ProficiencyTest"."candidateEmail" = c.email 
  AND (
    "ProficiencyTest"."companyId" = c."companyId" 
    OR ("ProficiencyTest"."companyId" IS NULL AND c."companyId" IS NOT NULL)
  );

UPDATE "WritingTest" 
SET "candidateId_temp" = c.id
FROM "Candidate" c
WHERE "WritingTest"."candidateEmail" = c.email 
  AND "WritingTest"."companyId" = c."companyId";

-- Step 5: Handle null companyId in ProficiencyTest
UPDATE "ProficiencyTest" 
SET "companyId" = (SELECT id FROM "Company" LIMIT 1)
WHERE "companyId" IS NULL;

-- Step 6: Update table structures
-- Update Admin table
ALTER TABLE "Admin" DROP COLUMN "role";
ALTER TABLE "Admin" ADD COLUMN "role" "AdminRole" NOT NULL DEFAULT 'companyadmin';

-- Update Candidate table
ALTER TABLE "Candidate" DROP COLUMN "status";
ALTER TABLE "Candidate" ADD COLUMN "status" "TestStatus" NOT NULL DEFAULT 'active';

-- Update CandidateTest table
ALTER TABLE "CandidateTest" DROP COLUMN "status";
ALTER TABLE "CandidateTest" ADD COLUMN "status" "TestStatus" NOT NULL DEFAULT 'active';

-- Update ProficiencyTest table
ALTER TABLE "ProficiencyTest" 
  DROP COLUMN "candidateEmail",
  DROP COLUMN "candidateName",
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ALTER COLUMN "companyId" SET NOT NULL,
  DROP COLUMN "status",
  ADD COLUMN "status" "TestStatus" NOT NULL DEFAULT 'active';

-- Add the actual candidateId column and populate it
ALTER TABLE "ProficiencyTest" ADD COLUMN "candidateId" TEXT NOT NULL DEFAULT '';
UPDATE "ProficiencyTest" SET "candidateId" = "candidateId_temp" WHERE "candidateId_temp" IS NOT NULL;
ALTER TABLE "ProficiencyTest" DROP COLUMN "candidateId_temp";

-- Update WritingTest table
ALTER TABLE "WritingTest" 
  DROP COLUMN "candidateEmail",
  DROP COLUMN "candidateName",
  DROP COLUMN "status",
  ADD COLUMN "status" "TestStatus" NOT NULL DEFAULT 'active';

-- Add the actual candidateId column and populate it
ALTER TABLE "WritingTest" ADD COLUMN "candidateId" TEXT NOT NULL DEFAULT '';
UPDATE "WritingTest" SET "candidateId" = "candidateId_temp" WHERE "candidateId_temp" IS NOT NULL;
ALTER TABLE "WritingTest" DROP COLUMN "candidateId_temp";

-- Step 7: Drop unused User table and CandidateStatus enum
DROP TABLE "User";
DROP TYPE "CandidateStatus";

-- Step 8: Create new indexes
CREATE INDEX "Admin_email_idx" ON "Admin"("email");
CREATE INDEX "Candidate_companyId_status_createdAt_idx" ON "Candidate"("companyId", "status", "createdAt");
CREATE INDEX "Candidate_email_companyId_idx" ON "Candidate"("email", "companyId");
CREATE INDEX "CandidateTest_candidateId_status_idx" ON "CandidateTest"("candidateId", "status");
CREATE INDEX "Company_createdAt_idx" ON "Company"("createdAt");
CREATE INDEX "EQQuestion_module_submodule_isActive_idx" ON "EQQuestion"("module", "submodule", "isActive");
CREATE INDEX "EQResult_candidateId_testId_idx" ON "EQResult"("candidateId", "testId");
CREATE INDEX "EQTest_companyId_isActive_idx" ON "EQTest"("companyId", "isActive");
CREATE INDEX "GlobalProficiencyQuestion_type_difficulty_language_idx" ON "GlobalProficiencyQuestion"("type", "difficulty", "language");
CREATE INDEX "ProficiencyTest_candidateId_idx" ON "ProficiencyTest"("candidateId");
CREATE INDEX "ProficiencyTest_candidateId_companyId_idx" ON "ProficiencyTest"("candidateId", "companyId");
CREATE INDEX "Question_type_difficulty_language_idx" ON "Question"("type", "difficulty", "language");
CREATE INDEX "Test_companyId_status_createdAt_idx" ON "Test"("companyId", "status", "createdAt");
CREATE INDEX "WritingQuestion_type_language_isActive_idx" ON "WritingQuestion"("type", "language", "isActive");
CREATE INDEX "WritingTest_candidateId_idx" ON "WritingTest"("candidateId");
CREATE INDEX "WritingTest_candidateId_companyId_idx" ON "WritingTest"("candidateId", "companyId");

-- Step 9: Add back foreign key constraints with CASCADE options
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Test" ADD CONSTRAINT "Test_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Test" ADD CONSTRAINT "Test_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestQuestion" ADD CONSTRAINT "TestQuestion_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestQuestion" ADD CONSTRAINT "TestQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateTest" ADD CONSTRAINT "CandidateTest_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateTest" ADD CONSTRAINT "CandidateTest_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateTestQuestion" ADD CONSTRAINT "CandidateTestQuestion_candidateTestId_fkey" FOREIGN KEY ("candidateTestId") REFERENCES "CandidateTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateTestQuestion" ADD CONSTRAINT "CandidateTestQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Response" ADD CONSTRAINT "Response_candidateTestId_fkey" FOREIGN KEY ("candidateTestId") REFERENCES "CandidateTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Response" ADD CONSTRAINT "Response_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_candidateTestId_fkey" FOREIGN KEY ("candidateTestId") REFERENCES "CandidateTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GlobalProficiencyQuestion" ADD CONSTRAINT "GlobalProficiencyQuestion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProficiencyTest" ADD CONSTRAINT "ProficiencyTest_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProficiencyTest" ADD CONSTRAINT "ProficiencyTest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EQQuestion" ADD CONSTRAINT "EQQuestion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EQTest" ADD CONSTRAINT "EQTest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EQResponse" ADD CONSTRAINT "EQResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "EQQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EQResponse" ADD CONSTRAINT "EQResponse_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "EQResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EQResult" ADD CONSTRAINT "EQResult_testId_fkey" FOREIGN KEY ("testId") REFERENCES "EQTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EQResult" ADD CONSTRAINT "EQResult_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WritingTest" ADD CONSTRAINT "WritingTest_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WritingTest" ADD CONSTRAINT "WritingTest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WritingQuestion" ADD CONSTRAINT "WritingQuestion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WritingResponse" ADD CONSTRAINT "WritingResponse_testId_fkey" FOREIGN KEY ("testId") REFERENCES "WritingTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WritingResponse" ADD CONSTRAINT "WritingResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "WritingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WritingResult" ADD CONSTRAINT "WritingResult_testId_fkey" FOREIGN KEY ("testId") REFERENCES "WritingTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
