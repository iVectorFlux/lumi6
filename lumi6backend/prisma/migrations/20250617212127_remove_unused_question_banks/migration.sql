/*
  Warnings:

  - You are about to drop the `GlobalSpeakingQuestion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SpeakingEnglishQuestion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `question_banks` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "GlobalSpeakingQuestion" DROP CONSTRAINT "GlobalSpeakingQuestion_companyId_fkey";

-- DropForeignKey
ALTER TABLE "SpeakingEnglishQuestion" DROP CONSTRAINT "SpeakingEnglishQuestion_companyId_fkey";

-- DropTable
DROP TABLE "GlobalSpeakingQuestion";

-- DropTable
DROP TABLE "SpeakingEnglishQuestion";

-- DropTable
DROP TABLE "question_banks";
