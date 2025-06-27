import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
// import { selectUniqueQuestions } from '../services/questionSelector';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createTestSchema = z.object({
  candidateName: z.string().min(2),
  candidateEmail: z.string().email(),
  companyId: z.string().uuid()
});

const recreateTestSchema = z.object({
  testId: z.string().uuid(),
  candidateId: z.string().uuid(),
  preserveResponses: z.boolean().optional().default(false)
});

// Create a new test
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { candidateName, candidateEmail, companyId } = createTestSchema.parse(req.body);
    const adminId = req.admin!.id;

    // Generate a random password for the candidate
    const candidatePassword = Math.random().toString(36).substring(2, 10);

    // Create test, candidate, and candidateTest in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the test with selectionStrategy 'balanced'
      const test = await tx.test.create({
        data: {
          adminId,
          selectionStrategy: 'balanced',
          companyId: companyId,
        }
      });
      // 2. Create the candidate
      const candidate = await tx.candidate.create({
        data: {
          name: candidateName,
          email: candidateEmail,
          password: candidatePassword,
          status: 'active',
          company: { connect: { id: companyId } },
        }
      });
      // 3. Link candidate and test via CandidateTest
      const candidateTest = await tx.candidateTest.create({
        data: {
          candidateId: candidate.id,
          testId: test.id,
          status: 'active',
        }
      });
      return { test, candidate, candidateTest };
    });

    res.status(201).json({
      testId: result.test.id,
      candidateId: result.candidate.id,
      candidatePassword
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Error creating test' });
  }
});

// Get all tests for an admin
router.get('/', authenticateToken, async (req, res) => {
  try {
    const adminId = req.admin!.id;
    const tests = await prisma.test.findMany({
      where: { adminId },
      include: {
        candidateTests: {
          include: {
            result: true
          }
        }
      }
    });

    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching tests' });
  }
});

// Get a specific test
router.get('/:testId', authenticateToken, async (req, res) => {
  try {
    const { testId } = req.params;
    const adminId = req.admin!.id;

    const test = await prisma.test.findFirst({
      where: {
        id: testId,
        adminId
      },
      include: {
        candidateTests: {
          include: {
            result: true
          }
        }
      }
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    res.json(test);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching test' });
  }
});

/**
 * Recreate a test for a candidate
 * POST /api/tests/recreate
 */
router.post('/recreate', authenticateToken, async (req, res) => {
  try {
    const { testId, candidateId, preserveResponses } = recreateTestSchema.parse(req.body);
    const adminId = req.admin!.id;
    
    // Check if the test exists and belongs to this admin
    const originalTest = await prisma.test.findFirst({
      where: {
        id: testId,
        adminId
      },
      include: {
        questions: {
          include: {
            question: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });
    
    if (!originalTest) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    // Check if the candidate exists
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId }
    });
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    
    // Create a new candidate test
    const newCandidateTest = await prisma.candidateTest.create({
      data: {
        candidateId,
        testId,
        status: 'active',
        startedAt: null,
        completedAt: null
      }
    });
    
    // Select questions for the test
    // Temporarily disabled - const questions = await selectUniqueQuestions(testId, candidateId, originalTest.questionCount);
    const questions: any[] = []; // Placeholder
    
    // Create candidate test questions
    const candidateTestQuestions = await Promise.all(
      questions.map((question, index) => {
        return prisma.candidateTestQuestion.create({
          data: {
            candidateTestId: newCandidateTest.id,
            questionId: question.id,
            order: index
          }
        });
      })
    );
    
    // If preserving responses, copy over previous responses
    if (preserveResponses) {
      // Find the most recent completed test for this candidate
      const previousTest = await prisma.candidateTest.findFirst({
        where: {
          candidateId,
          testId,
          status: 'completed',
          id: { not: newCandidateTest.id }
        },
        include: {
          responses: true
        },
        orderBy: {
          completedAt: 'desc'
        }
      });
      
      if (previousTest) {
        // Copy applicable responses to the new test
        for (const response of previousTest.responses) {
          // Check if this question is in the new test
          const newTestQuestion = candidateTestQuestions.find(
            q => q.questionId === response.questionId
          );
          
          if (newTestQuestion) {
            await prisma.response.create({
              data: {
                candidateTestId: newCandidateTest.id,
                questionId: response.questionId,
                answer: response.answer,
                videoUrl: response.videoUrl,
                transcription: response.transcription
              }
            });
          }
        }
      }
    }
    
    res.status(201).json({
      message: 'Test recreated successfully',
      candidateTestId: newCandidateTest.id,
      questionCount: candidateTestQuestions.length
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error recreating test:', error);
    res.status(500).json({ error: 'Error recreating test' });
  }
});

export default router; 