import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function importQuestions() {
  const filePath = path.resolve('./cleaned_proficiency_questions.json');
  const questions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let count = 0;
  for (const q of questions) {
    await prisma.globalProficiencyQuestion.create({ data: { ...q, difficulty: 'A1' } });
    count++;
  }
  console.log(`Imported ${count} questions into GlobalProficiencyQuestion table.`);
}

importQuestions().finally(() => prisma.$disconnect()); 