-- AlterTable
ALTER TABLE "EQQuestion" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE "GlobalProficiencyQuestion" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE "GlobalSpeakingQuestion" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE "SpeakingEnglishQuestion" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE "question_banks" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en';

-- CreateIndex
CREATE INDEX "EQQuestion_language_idx" ON "EQQuestion"("language");

-- CreateIndex
CREATE INDEX "GlobalProficiencyQuestion_language_idx" ON "GlobalProficiencyQuestion"("language");

-- CreateIndex
CREATE INDEX "GlobalSpeakingQuestion_language_idx" ON "GlobalSpeakingQuestion"("language");

-- CreateIndex
CREATE INDEX "Question_language_idx" ON "Question"("language");

-- CreateIndex
CREATE INDEX "SpeakingEnglishQuestion_language_idx" ON "SpeakingEnglishQuestion"("language");

-- CreateIndex
CREATE INDEX "question_banks_language_idx" ON "question_banks"("language");
