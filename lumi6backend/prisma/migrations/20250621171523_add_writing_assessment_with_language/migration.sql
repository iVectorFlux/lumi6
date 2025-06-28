-- CreateTable
CREATE TABLE "WritingTest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Writing Assessment',
    "description" TEXT,
    "candidateName" TEXT NOT NULL,
    "candidateEmail" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "password" TEXT NOT NULL,
    "timeLimit" INTEGER NOT NULL DEFAULT 600,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingQuestion" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "imageUrl" TEXT,
    "order" INTEGER NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "companyId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingResponse" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingResult" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "cefrLevel" "CEFRLevel" NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "grammarScore" INTEGER NOT NULL,
    "coherenceScore" INTEGER NOT NULL,
    "rangeScore" INTEGER NOT NULL,
    "vocabularyScore" INTEGER NOT NULL,
    "commandScore" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,
    "detailedAnalysis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WritingTest_companyId_idx" ON "WritingTest"("companyId");

-- CreateIndex
CREATE INDEX "WritingTest_language_idx" ON "WritingTest"("language");

-- CreateIndex
CREATE INDEX "WritingTest_status_idx" ON "WritingTest"("status");

-- CreateIndex
CREATE INDEX "WritingTest_candidateEmail_idx" ON "WritingTest"("candidateEmail");

-- CreateIndex
CREATE INDEX "WritingTest_completedAt_idx" ON "WritingTest"("completedAt");

-- CreateIndex
CREATE INDEX "WritingQuestion_type_idx" ON "WritingQuestion"("type");

-- CreateIndex
CREATE INDEX "WritingQuestion_order_idx" ON "WritingQuestion"("order");

-- CreateIndex
CREATE INDEX "WritingQuestion_language_idx" ON "WritingQuestion"("language");

-- CreateIndex
CREATE INDEX "WritingQuestion_companyId_idx" ON "WritingQuestion"("companyId");

-- CreateIndex
CREATE INDEX "WritingQuestion_isActive_idx" ON "WritingQuestion"("isActive");

-- CreateIndex
CREATE INDEX "WritingResponse_testId_idx" ON "WritingResponse"("testId");

-- CreateIndex
CREATE INDEX "WritingResponse_questionId_idx" ON "WritingResponse"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "WritingResponse_testId_questionId_key" ON "WritingResponse"("testId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "WritingResult_testId_key" ON "WritingResult"("testId");

-- CreateIndex
CREATE INDEX "WritingResult_cefrLevel_idx" ON "WritingResult"("cefrLevel");

-- CreateIndex
CREATE INDEX "WritingResult_overallScore_idx" ON "WritingResult"("overallScore");

-- CreateIndex
CREATE INDEX "WritingResult_createdAt_idx" ON "WritingResult"("createdAt");

-- AddForeignKey
ALTER TABLE "WritingTest" ADD CONSTRAINT "WritingTest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingQuestion" ADD CONSTRAINT "WritingQuestion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingResponse" ADD CONSTRAINT "WritingResponse_testId_fkey" FOREIGN KEY ("testId") REFERENCES "WritingTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingResponse" ADD CONSTRAINT "WritingResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "WritingQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingResult" ADD CONSTRAINT "WritingResult_testId_fkey" FOREIGN KEY ("testId") REFERENCES "WritingTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
