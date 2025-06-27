/*
  Warnings:

  - The primary key for the `bank_questions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `category` on the `bank_questions` table. All the data in the column will be lost.
  - You are about to drop the column `correctAnswer` on the `bank_questions` table. All the data in the column will be lost.
  - You are about to drop the column `mediaUrl` on the `bank_questions` table. All the data in the column will be lost.
  - You are about to drop the column `options` on the `bank_questions` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `bank_questions` table. All the data in the column will be lost.
  - You are about to drop the column `text` on the `bank_questions` table. All the data in the column will be lost.
  - The primary key for the `question_banks` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "bank_questions" DROP CONSTRAINT "bank_questions_questionBankId_fkey";

-- AlterTable
ALTER TABLE "bank_questions" DROP CONSTRAINT "bank_questions_pkey",
DROP COLUMN "category",
DROP COLUMN "correctAnswer",
DROP COLUMN "mediaUrl",
DROP COLUMN "options",
DROP COLUMN "score",
DROP COLUMN "text",
ADD COLUMN     "question" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "questionBankId" SET DATA TYPE TEXT,
ADD CONSTRAINT "bank_questions_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "bank_questions_id_seq";

-- AlterTable
ALTER TABLE "question_banks" DROP CONSTRAINT "question_banks_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "question_banks_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "question_banks_id_seq";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL,
    "permissions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "bank_questions" ADD CONSTRAINT "bank_questions_questionBankId_fkey" FOREIGN KEY ("questionBankId") REFERENCES "question_banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
