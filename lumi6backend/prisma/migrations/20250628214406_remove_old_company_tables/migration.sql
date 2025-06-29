/*
  Warnings:

  - You are about to drop the column `credits` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the `CompanyCredit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CompanyTestPermission` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CompanyCredit" DROP CONSTRAINT "CompanyCredit_companyId_fkey";

-- DropForeignKey
ALTER TABLE "CompanyTestPermission" DROP CONSTRAINT "CompanyTestPermission_companyId_fkey";

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "credits",
ADD COLUMN     "subdomain" TEXT;

-- DropTable
DROP TABLE "CompanyCredit";

-- DropTable
DROP TABLE "CompanyTestPermission";

-- CreateTable
CREATE TABLE "CompanyTestConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "testType" "TestType" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "totalCredits" INTEGER NOT NULL DEFAULT 0,
    "usedCredits" INTEGER NOT NULL DEFAULT 0,
    "availableCredits" INTEGER NOT NULL DEFAULT 0,
    "expiryDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxDailyTests" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyTestConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyTestConfig_companyId_idx" ON "CompanyTestConfig"("companyId");

-- CreateIndex
CREATE INDEX "CompanyTestConfig_testType_idx" ON "CompanyTestConfig"("testType");

-- CreateIndex
CREATE INDEX "CompanyTestConfig_isEnabled_idx" ON "CompanyTestConfig"("isEnabled");

-- CreateIndex
CREATE INDEX "CompanyTestConfig_isActive_idx" ON "CompanyTestConfig"("isActive");

-- CreateIndex
CREATE INDEX "CompanyTestConfig_companyId_testType_isEnabled_idx" ON "CompanyTestConfig"("companyId", "testType", "isEnabled");

-- CreateIndex
CREATE INDEX "CompanyTestConfig_companyId_testType_isActive_idx" ON "CompanyTestConfig"("companyId", "testType", "isActive");

-- CreateIndex
CREATE INDEX "CompanyTestConfig_expiryDate_isActive_idx" ON "CompanyTestConfig"("expiryDate", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyTestConfig_companyId_testType_key" ON "CompanyTestConfig"("companyId", "testType");

-- CreateIndex
CREATE INDEX "Company_subdomain_idx" ON "Company"("subdomain");

-- AddForeignKey
ALTER TABLE "CompanyTestConfig" ADD CONSTRAINT "CompanyTestConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
