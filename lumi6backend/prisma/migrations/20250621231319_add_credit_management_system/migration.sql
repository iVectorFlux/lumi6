-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('SPEAKING', 'PROFICIENCY', 'EQ', 'WRITING');

-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('PURCHASE', 'CONSUMPTION', 'REFUND', 'ADJUSTMENT', 'EXPIRY');

-- AlterTable
ALTER TABLE "EQTest" ADD COLUMN     "creditTransaction" TEXT,
ADD COLUMN     "creditsConsumed" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ProficiencyTest" ADD COLUMN     "creditTransaction" TEXT,
ADD COLUMN     "creditsConsumed" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "candidateId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "creditTransaction" TEXT,
ADD COLUMN     "creditsConsumed" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "WritingTest" ADD COLUMN     "creditTransaction" TEXT,
ADD COLUMN     "creditsConsumed" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "candidateId" DROP DEFAULT;

-- CreateTable
CREATE TABLE "CompanyTestPermission" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "testType" "TestType" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyTestPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyCredit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "testType" "TestType" NOT NULL,
    "totalCredits" INTEGER NOT NULL DEFAULT 0,
    "usedCredits" INTEGER NOT NULL DEFAULT 0,
    "availableCredits" INTEGER NOT NULL DEFAULT 0,
    "expiryDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "testType" "TestType" NOT NULL,
    "transactionType" "CreditTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyTestPermission_companyId_idx" ON "CompanyTestPermission"("companyId");

-- CreateIndex
CREATE INDEX "CompanyTestPermission_testType_idx" ON "CompanyTestPermission"("testType");

-- CreateIndex
CREATE INDEX "CompanyTestPermission_isEnabled_idx" ON "CompanyTestPermission"("isEnabled");

-- CreateIndex
CREATE INDEX "CompanyTestPermission_companyId_testType_isEnabled_idx" ON "CompanyTestPermission"("companyId", "testType", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyTestPermission_companyId_testType_key" ON "CompanyTestPermission"("companyId", "testType");

-- CreateIndex
CREATE INDEX "CompanyCredit_companyId_idx" ON "CompanyCredit"("companyId");

-- CreateIndex
CREATE INDEX "CompanyCredit_testType_idx" ON "CompanyCredit"("testType");

-- CreateIndex
CREATE INDEX "CompanyCredit_expiryDate_idx" ON "CompanyCredit"("expiryDate");

-- CreateIndex
CREATE INDEX "CompanyCredit_isActive_idx" ON "CompanyCredit"("isActive");

-- CreateIndex
CREATE INDEX "CompanyCredit_companyId_testType_isActive_idx" ON "CompanyCredit"("companyId", "testType", "isActive");

-- CreateIndex
CREATE INDEX "CompanyCredit_expiryDate_isActive_idx" ON "CompanyCredit"("expiryDate", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyCredit_companyId_testType_key" ON "CompanyCredit"("companyId", "testType");

-- CreateIndex
CREATE INDEX "CreditTransaction_companyId_idx" ON "CreditTransaction"("companyId");

-- CreateIndex
CREATE INDEX "CreditTransaction_testType_idx" ON "CreditTransaction"("testType");

-- CreateIndex
CREATE INDEX "CreditTransaction_transactionType_idx" ON "CreditTransaction"("transactionType");

-- CreateIndex
CREATE INDEX "CreditTransaction_createdAt_idx" ON "CreditTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "CreditTransaction_referenceId_idx" ON "CreditTransaction"("referenceId");

-- CreateIndex
CREATE INDEX "CreditTransaction_referenceType_idx" ON "CreditTransaction"("referenceType");

-- CreateIndex
CREATE INDEX "CreditTransaction_createdBy_idx" ON "CreditTransaction"("createdBy");

-- CreateIndex
CREATE INDEX "CreditTransaction_companyId_testType_createdAt_idx" ON "CreditTransaction"("companyId", "testType", "createdAt");

-- CreateIndex
CREATE INDEX "CreditTransaction_companyId_transactionType_createdAt_idx" ON "CreditTransaction"("companyId", "transactionType", "createdAt");

-- CreateIndex
CREATE INDEX "Admin_role_idx" ON "Admin"("role");

-- CreateIndex
CREATE INDEX "Candidate_status_idx" ON "Candidate"("status");

-- CreateIndex
CREATE INDEX "CandidateTest_status_idx" ON "CandidateTest"("status");

-- CreateIndex
CREATE INDEX "ProficiencyTest_status_idx" ON "ProficiencyTest"("status");

-- CreateIndex
CREATE INDEX "WritingTest_status_idx" ON "WritingTest"("status");

-- AddForeignKey
ALTER TABLE "CompanyTestPermission" ADD CONSTRAINT "CompanyTestPermission_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyCredit" ADD CONSTRAINT "CompanyCredit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
