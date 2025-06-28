import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function importEQQuestions() {
  const filePath = path.resolve('./cleaned_eq_questions.json');
  const questions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let count = 0;
  for (const q of questions) {
    // Ensure required fields exist
    if (!q.text || !q.type) continue;
    await prisma.eQQuestion.create({
      data: {
        text: q.text,
        type: q.type,
        module: q.module || 'generic',
        submodule: q.submodule || 'general',
        category: q.category || 'General',
        difficulty: q.difficulty || 'General',
        options: q.options ?? undefined,
        correctAnswer: q.correctAnswer ?? undefined,
        normalizedScore: q.normalizedScore ?? 0,
        weight: q.weight ?? 1.0,
        scoring: q.scoring ?? undefined,
        language: q.language || 'en',
      },
    });
    count++;
  }
  console.log(`Imported ${count} EQ questions into EQQuestion table.`);
}

importEQQuestions()
  .catch((e) => {
    console.error('Error importing EQ questions:', e);
  })
  .finally(() => prisma.$disconnect()); 