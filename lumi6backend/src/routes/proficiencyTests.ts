import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { mapScoreToCEFR, API_DEFAULTS, PROFICIENCY_TEST_CONFIG } from '../config/constants';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// POST /api/proficiency-tests
router.post('/', async (req, res) => {
  try {
    const { candidateName, candidateEmail, companyId } = req.body;
    if (!candidateName || !candidateEmail) {
      return res.status(400).json({ error: 'Missing candidateName or candidateEmail' });
    }
    
    // Find or create candidate
    let candidate = await prisma.candidate.findFirst({
      where: { 
        email: candidateEmail,
        companyId: companyId || undefined
      }
    });
    
    if (!candidate) {
      candidate = await prisma.candidate.create({
        data: {
          name: candidateName,
          email: candidateEmail,
          password: crypto.randomBytes(16).toString('hex'), // temporary password
          companyId: companyId || '',
          status: 'active'
        }
      });
    }
    
    const password = crypto.randomBytes(PROFICIENCY_TEST_CONFIG.PASSWORD_LENGTH / 2).toString('hex');
    const test = await prisma.proficiencyTest.create({
      data: {
        candidateId: candidate.id,
        companyId: companyId || '',
        status: 'active',
        password,
      },
    });
    const testLink = `${process.env.FRONTEND_URL || API_DEFAULTS.FRONTEND_URL}/proficiency-test/${test.id}`;
    res.json({ testId: test.id, password, testLink });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create proficiency test' });
  }
});

// GET /api/proficiency-tests/:testId/questions
router.get('/:testId/questions', async (req, res) => {
  try {
    const { testId } = req.params;
    // Optionally: check if test exists
    const questions = await prisma.globalProficiencyQuestion.findMany({
      orderBy: { createdAt: 'asc' },
      take: PROFICIENCY_TEST_CONFIG.TOTAL_QUESTIONS,
    });
    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// POST /api/proficiency-tests/:testId/submit
router.post('/:testId/submit', async (req, res) => {
  try {
    const { testId } = req.params;
    const { answers } = req.body; // [{questionId, answer}]
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'No answers submitted' });
    }
    // Fetch correct answers
    const questions = await prisma.globalProficiencyQuestion.findMany({
      where: { id: { in: answers.map(a => a.questionId) } },
    });
    let score = 0;
    for (const ans of answers) {
      const q = questions.find((question) => question.id === ans.questionId);
      if (q && q.correctAnswer && ans.answer === q.correctAnswer) {
        score++;
      }
    }
    const result = mapScoreToCEFR(score);
    await prisma.proficiencyTest.update({
      where: { id: testId },
      data: {
        status: 'completed',
        answers,
        score,
        result,
        completedAt: new Date(),
      },
    });
    res.json({ score, result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit answers' });
  }
});

// GET /api/proficiency-tests/:testId/result
router.get('/:testId/result', async (req, res) => {
  try {
    const { testId } = req.params;
    const test = await prisma.proficiencyTest.findUnique({ where: { id: testId } });
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json({ score: test.score, result: test.result, answers: test.answers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch result' });
  }
});

export default router; 