-- CreateTable
CREATE TABLE "BusinessUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "businessUnit" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "status" "CandidateStatus" NOT NULL DEFAULT 'pending',
    "companyId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessUnit_companyId_idx" ON "BusinessUnit"("companyId");

-- CreateIndex
CREATE INDEX "BusinessUnit_status_idx" ON "BusinessUnit"("status");

-- CreateIndex
CREATE INDEX "BusinessUnit_email_idx" ON "BusinessUnit"("email");

-- CreateIndex
CREATE INDEX "BusinessUnit_createdBy_idx" ON "BusinessUnit"("createdBy");

-- CreateIndex
CREATE INDEX "BusinessUnit_businessUnit_idx" ON "BusinessUnit"("businessUnit");

-- CreateIndex
CREATE INDEX "BusinessUnit_region_idx" ON "BusinessUnit"("region");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessUnit_email_companyId_key" ON "BusinessUnit"("email", "companyId");

-- AddForeignKey
ALTER TABLE "BusinessUnit" ADD CONSTRAINT "BusinessUnit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessUnit" ADD CONSTRAINT "BusinessUnit_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
