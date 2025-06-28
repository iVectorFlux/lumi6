/*
  Warnings:

  - Added the required column `module` to the `EQQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `submodule` to the `EQQuestion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "EQQuestion" ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "correctAnswer" TEXT,
ADD COLUMN     "inconsistencyPairId" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isReversed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "module" TEXT NOT NULL,
ADD COLUMN     "normalizedScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "submodule" TEXT NOT NULL,
ADD COLUMN     "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0;

-- AlterTable
ALTER TABLE "GlobalProficiencyQuestion" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "GlobalSpeakingQuestion" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "ProficiencyTest" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SpeakingEnglishQuestion" ADD COLUMN     "companyId" TEXT;

-- CreateTable
CREATE TABLE "EQTest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "companyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EQTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EQResponse" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EQResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EQResult" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "eqRating" TEXT NOT NULL,
    "moduleScores" JSONB NOT NULL,
    "submoduleScores" JSONB NOT NULL,
    "inconsistencyIndex" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inconsistencyRating" TEXT NOT NULL DEFAULT 'Very consistent',
    "inconsistencyPairs" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EQResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EQTest_companyId_idx" ON "EQTest"("companyId");

-- CreateIndex
CREATE INDEX "EQTest_isActive_idx" ON "EQTest"("isActive");

-- CreateIndex
CREATE INDEX "EQResponse_questionId_idx" ON "EQResponse"("questionId");

-- CreateIndex
CREATE INDEX "EQResponse_resultId_idx" ON "EQResponse"("resultId");

-- CreateIndex
CREATE INDEX "EQResult_testId_idx" ON "EQResult"("testId");

-- CreateIndex
CREATE INDEX "EQResult_candidateId_idx" ON "EQResult"("candidateId");

-- CreateIndex
CREATE INDEX "EQResult_overallScore_idx" ON "EQResult"("overallScore");

-- CreateIndex
CREATE INDEX "EQResult_completedAt_idx" ON "EQResult"("completedAt");

-- CreateIndex
CREATE INDEX "Admin_role_idx" ON "Admin"("role");

-- CreateIndex
CREATE INDEX "Admin_companyId_idx" ON "Admin"("companyId");

-- CreateIndex
CREATE INDEX "Candidate_companyId_idx" ON "Candidate"("companyId");

-- CreateIndex
CREATE INDEX "Candidate_status_idx" ON "Candidate"("status");

-- CreateIndex
CREATE INDEX "Candidate_email_idx" ON "Candidate"("email");

-- CreateIndex
CREATE INDEX "Candidate_createdBy_idx" ON "Candidate"("createdBy");

-- CreateIndex
CREATE INDEX "CandidateTest_candidateId_idx" ON "CandidateTest"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateTest_testId_idx" ON "CandidateTest"("testId");

-- CreateIndex
CREATE INDEX "CandidateTest_status_idx" ON "CandidateTest"("status");

-- CreateIndex
CREATE INDEX "CandidateTest_completedAt_idx" ON "CandidateTest"("completedAt");

-- CreateIndex
CREATE INDEX "CandidateTestQuestion_candidateTestId_idx" ON "CandidateTestQuestion"("candidateTestId");

-- CreateIndex
CREATE INDEX "CandidateTestQuestion_questionId_idx" ON "CandidateTestQuestion"("questionId");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- CreateIndex
CREATE INDEX "EQQuestion_type_idx" ON "EQQuestion"("type");

-- CreateIndex
CREATE INDEX "EQQuestion_module_idx" ON "EQQuestion"("module");

-- CreateIndex
CREATE INDEX "EQQuestion_submodule_idx" ON "EQQuestion"("submodule");

-- CreateIndex
CREATE INDEX "EQQuestion_isActive_idx" ON "EQQuestion"("isActive");

-- CreateIndex
CREATE INDEX "EQQuestion_inconsistencyPairId_idx" ON "EQQuestion"("inconsistencyPairId");

-- CreateIndex
CREATE INDEX "EQQuestion_companyId_idx" ON "EQQuestion"("companyId");

-- CreateIndex
CREATE INDEX "GlobalProficiencyQuestion_type_idx" ON "GlobalProficiencyQuestion"("type");

-- CreateIndex
CREATE INDEX "GlobalProficiencyQuestion_category_idx" ON "GlobalProficiencyQuestion"("category");

-- CreateIndex
CREATE INDEX "GlobalProficiencyQuestion_difficulty_idx" ON "GlobalProficiencyQuestion"("difficulty");

-- CreateIndex
CREATE INDEX "GlobalProficiencyQuestion_companyId_idx" ON "GlobalProficiencyQuestion"("companyId");

-- CreateIndex
CREATE INDEX "GlobalSpeakingQuestion_type_idx" ON "GlobalSpeakingQuestion"("type");

-- CreateIndex
CREATE INDEX "GlobalSpeakingQuestion_category_idx" ON "GlobalSpeakingQuestion"("category");

-- CreateIndex
CREATE INDEX "GlobalSpeakingQuestion_difficulty_idx" ON "GlobalSpeakingQuestion"("difficulty");

-- CreateIndex
CREATE INDEX "GlobalSpeakingQuestion_companyId_idx" ON "GlobalSpeakingQuestion"("companyId");

-- CreateIndex
CREATE INDEX "ProficiencyTest_companyId_idx" ON "ProficiencyTest"("companyId");

-- CreateIndex
CREATE INDEX "ProficiencyTest_status_idx" ON "ProficiencyTest"("status");

-- CreateIndex
CREATE INDEX "ProficiencyTest_candidateEmail_idx" ON "ProficiencyTest"("candidateEmail");

-- CreateIndex
CREATE INDEX "ProficiencyTest_completedAt_idx" ON "ProficiencyTest"("completedAt");

-- CreateIndex
CREATE INDEX "Question_adminId_idx" ON "Question"("adminId");

-- CreateIndex
CREATE INDEX "Question_type_idx" ON "Question"("type");

-- CreateIndex
CREATE INDEX "Question_category_idx" ON "Question"("category");

-- CreateIndex
CREATE INDEX "Question_difficulty_idx" ON "Question"("difficulty");

-- CreateIndex
CREATE INDEX "Response_candidateTestId_idx" ON "Response"("candidateTestId");

-- CreateIndex
CREATE INDEX "Response_questionId_idx" ON "Response"("questionId");

-- CreateIndex
CREATE INDEX "SpeakingEnglishQuestion_type_idx" ON "SpeakingEnglishQuestion"("type");

-- CreateIndex
CREATE INDEX "SpeakingEnglishQuestion_category_idx" ON "SpeakingEnglishQuestion"("category");

-- CreateIndex
CREATE INDEX "SpeakingEnglishQuestion_difficulty_idx" ON "SpeakingEnglishQuestion"("difficulty");

-- CreateIndex
CREATE INDEX "SpeakingEnglishQuestion_companyId_idx" ON "SpeakingEnglishQuestion"("companyId");

-- CreateIndex
CREATE INDEX "Test_adminId_idx" ON "Test"("adminId");

-- CreateIndex
CREATE INDEX "Test_companyId_idx" ON "Test"("companyId");

-- CreateIndex
CREATE INDEX "Test_status_idx" ON "Test"("status");

-- CreateIndex
CREATE INDEX "Test_createdAt_idx" ON "Test"("createdAt");

-- CreateIndex
CREATE INDEX "TestQuestion_testId_idx" ON "TestQuestion"("testId");

-- CreateIndex
CREATE INDEX "TestQuestion_questionId_idx" ON "TestQuestion"("questionId");

-- CreateIndex
CREATE INDEX "TestResult_cefrLevel_idx" ON "TestResult"("cefrLevel");

-- CreateIndex
CREATE INDEX "TestResult_overallScore_idx" ON "TestResult"("overallScore");

-- CreateIndex
CREATE INDEX "TestResult_timestamp_idx" ON "TestResult"("timestamp");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "question_banks_type_idx" ON "question_banks"("type");

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingEnglishQuestion" ADD CONSTRAINT "SpeakingEnglishQuestion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalProficiencyQuestion" ADD CONSTRAINT "GlobalProficiencyQuestion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalSpeakingQuestion" ADD CONSTRAINT "GlobalSpeakingQuestion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EQQuestion" ADD CONSTRAINT "EQQuestion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EQTest" ADD CONSTRAINT "EQTest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EQResponse" ADD CONSTRAINT "EQResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "EQQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EQResponse" ADD CONSTRAINT "EQResponse_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "EQResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EQResult" ADD CONSTRAINT "EQResult_testId_fkey" FOREIGN KEY ("testId") REFERENCES "EQTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EQResult" ADD CONSTRAINT "EQResult_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
