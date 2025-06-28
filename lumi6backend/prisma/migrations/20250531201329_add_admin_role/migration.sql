-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('active', 'completed', 'expired');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('pending', 'in_progress', 'completed', 'expired');

-- CreateEnum
CREATE TYPE "CEFRLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'companyadmin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Test" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'CEFR Assessment',
    "description" TEXT,
    "level" "CEFRLevel",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "TestStatus" NOT NULL DEFAULT 'active',
    "selectionStrategy" TEXT NOT NULL DEFAULT 'random',
    "questionCount" INTEGER NOT NULL DEFAULT 5,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "Test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" "CEFRLevel" NOT NULL,
    "mediaUrl" TEXT,
    "adminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestQuestion" (
    "testId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TestQuestion_pkey" PRIMARY KEY ("testId","questionId")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "status" "CandidateStatus" NOT NULL DEFAULT 'pending',
    "currentTestId" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateTest" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "status" "CandidateStatus" NOT NULL DEFAULT 'pending',
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tabSwitchEvents" JSONB,

    CONSTRAINT "CandidateTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateTestQuestion" (
    "id" TEXT NOT NULL,
    "candidateTestId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CandidateTestQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "candidateTestId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT,
    "videoUrl" TEXT,
    "transcription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestResult" (
    "id" TEXT NOT NULL,
    "candidateTestId" TEXT NOT NULL,
    "cefrLevel" "CEFRLevel" NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,
    "speakingScore" INTEGER NOT NULL,
    "fluencyScore" INTEGER NOT NULL,
    "pronunciationScore" INTEGER NOT NULL,
    "grammarScore" INTEGER NOT NULL,
    "vocabularyScore" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "videoUrl" TEXT,
    "detailedAnalysis" JSONB,
    "confidenceScore" INTEGER NOT NULL DEFAULT 0,
    "grammarErrors" JSONB,
    "vocabularyUsage" JSONB,
    "pronunciationIssues" JSONB,
    "fullTranscription" TEXT,

    CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateTest_candidateId_testId_createdAt_key" ON "CandidateTest"("candidateId", "testId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateTestQuestion_candidateTestId_questionId_key" ON "CandidateTestQuestion"("candidateTestId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "Response_candidateTestId_questionId_key" ON "Response"("candidateTestId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "TestResult_candidateTestId_key" ON "TestResult"("candidateTestId");

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestQuestion" ADD CONSTRAINT "TestQuestion_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestQuestion" ADD CONSTRAINT "TestQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateTest" ADD CONSTRAINT "CandidateTest_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateTest" ADD CONSTRAINT "CandidateTest_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateTestQuestion" ADD CONSTRAINT "CandidateTestQuestion_candidateTestId_fkey" FOREIGN KEY ("candidateTestId") REFERENCES "CandidateTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateTestQuestion" ADD CONSTRAINT "CandidateTestQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_candidateTestId_fkey" FOREIGN KEY ("candidateTestId") REFERENCES "CandidateTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_candidateTestId_fkey" FOREIGN KEY ("candidateTestId") REFERENCES "CandidateTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
