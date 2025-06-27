/*
  Warnings:

  - You are about to drop the `BankQuestion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuestionBank` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BankQuestion" DROP CONSTRAINT "BankQuestion_questionBankId_fkey";

-- DropTable
DROP TABLE "BankQuestion";

-- DropTable
DROP TABLE "QuestionBank";

-- CreateTable
CREATE TABLE "question_banks" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_questions" (
    "id" SERIAL NOT NULL,
    "questionBankId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "options" JSONB,
    "correctAnswer" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_questions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "bank_questions" ADD CONSTRAINT "bank_questions_questionBankId_fkey" FOREIGN KEY ("questionBankId") REFERENCES "question_banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
