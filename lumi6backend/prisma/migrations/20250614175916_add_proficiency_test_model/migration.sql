-- CreateTable
CREATE TABLE "ProficiencyTest" (
    "id" TEXT NOT NULL,
    "candidateName" TEXT NOT NULL,
    "candidateEmail" TEXT NOT NULL,
    "companyId" TEXT,
    "status" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "result" TEXT,
    "score" INTEGER,
    "answers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProficiencyTest_pkey" PRIMARY KEY ("id")
);
