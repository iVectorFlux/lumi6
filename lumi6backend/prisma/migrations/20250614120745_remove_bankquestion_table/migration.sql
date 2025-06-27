/*
  Warnings:

  - You are about to drop the `bank_questions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "bank_questions" DROP CONSTRAINT "bank_questions_questionBankId_fkey";

-- DropTable
DROP TABLE "bank_questions";
