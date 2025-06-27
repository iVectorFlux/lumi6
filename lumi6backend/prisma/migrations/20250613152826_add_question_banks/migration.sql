/*
  Warnings:

  - Added the required column `correctAnswer` to the `BankQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `score` to the `BankQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `BankQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `BankQuestion` table without a default value. This is not possible if the table is not empty.
  - Made the column `language` on table `BankQuestion` required. This step will fail if there are existing NULL values in that column.
  - Made the column `category` on table `BankQuestion` required. This step will fail if there are existing NULL values in that column.
  - Made the column `difficulty` on table `BankQuestion` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `QuestionBank` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BankQuestion" ADD COLUMN     "correctAnswer" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "mediaUrl" TEXT,
ADD COLUMN     "options" JSONB,
ADD COLUMN     "score" INTEGER NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "language" SET NOT NULL,
ALTER COLUMN "category" SET NOT NULL,
ALTER COLUMN "difficulty" SET NOT NULL;

-- AlterTable
ALTER TABLE "QuestionBank" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
