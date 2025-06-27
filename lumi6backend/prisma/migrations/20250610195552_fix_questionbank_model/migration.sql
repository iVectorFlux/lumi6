/*
  Warnings:

  - A unique constraint covering the columns `[email,companyId]` on the table `Candidate` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "QuestionBank" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "QuestionBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankQuestion" (
    "id" SERIAL NOT NULL,
    "questionBankId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "language" TEXT,
    "category" TEXT,
    "difficulty" TEXT,

    CONSTRAINT "BankQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_email_companyId_key" ON "Candidate"("email", "companyId");

-- AddForeignKey
ALTER TABLE "BankQuestion" ADD CONSTRAINT "BankQuestion_questionBankId_fkey" FOREIGN KEY ("questionBankId") REFERENCES "QuestionBank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
