/*
  Warnings:

  - You are about to drop the `BusinessUnit` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BusinessUnit" DROP CONSTRAINT "BusinessUnit_companyId_fkey";

-- DropForeignKey
ALTER TABLE "BusinessUnit" DROP CONSTRAINT "BusinessUnit_createdBy_fkey";

-- DropTable
DROP TABLE "BusinessUnit";

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "businessUnit" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" "CandidateStatus" NOT NULL DEFAULT 'pending',
    "companyId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Employee_companyId_idx" ON "Employee"("companyId");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE INDEX "Employee_email_idx" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_createdBy_idx" ON "Employee"("createdBy");

-- CreateIndex
CREATE INDEX "Employee_businessUnit_idx" ON "Employee"("businessUnit");

-- CreateIndex
CREATE INDEX "Employee_region_idx" ON "Employee"("region");

-- CreateIndex
CREATE INDEX "Employee_role_idx" ON "Employee"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_companyId_key" ON "Employee"("email", "companyId");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
