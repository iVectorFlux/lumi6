import { Router } from 'express';
import { PrismaClient, TestType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { authenticateToken } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/apiResponse';
import logger from '../utils/logger';
import { creditService } from '../services/creditService';

const router = Router();
const prisma = new PrismaClient();

// Default writing questions
const DEFAULT_WRITING_QUESTIONS = [
  {
    type: 'essay',
    title: 'Essay Writing',
    prompt: 'Write an essay (150-200 words) about the following topic: "The impact of technology on modern communication. Discuss both positive and negative aspects and provide your opinion with examples."',
    order: 1,
    language: 'en'
  },
  {
    type: 'image_description',
    title: 'Image Description',
    prompt: 'Look at the image below and write a detailed description (100-150 words). Describe what you see, the setting, the people or objects, and any activities taking place.',
    imageUrl: '/placeholder.svg', // Using placeholder for now
    order: 2,
    language: 'en'
  },
  {
    type: 'email',
    title: 'Email Writing',
    prompt: 'Write a formal email (100-120 words) to your manager requesting time off for a family event. Include: the reason for your request, the dates you need off, how you will handle your responsibilities, and a polite closing.',
    order: 3,
    language: 'en'
  }
];

// Initialize default questions if they don't exist
async function initializeDefaultQuestions() {
  try {
    const existingQuestions = await prisma.writingQuestion.count();
    if (existingQuestions === 0) {
      await prisma.writingQuestion.createMany({
        data: DEFAULT_WRITING_QUESTIONS
      });
      logger.info('Default writing questions initialized');
    }
  } catch (error) {
    logger.error('Error initializing default writing questions:', error);
  }
}

// Initialize questions on startup
initializeDefaultQuestions();

// Create a new writing test
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { candidateName, candidateEmail, title, description, language = 'en' } = req.body;
    // Retrieve companyId from authenticated admin
    const companyId = (req as any).admin?.companyId;

    if (!companyId) {
      return sendError(res, 'UNAUTHORIZED', 'Company context missing in token', 403);
    }

    if (!candidateName || !candidateEmail) {
      return sendError(res, 'VALIDATION_ERROR', 'Candidate name and email are required', 400);
    }

    // Generate random passwords for candidate and test
    const candidatePasswordPlain = Math.random().toString(36).substring(2, 10).toUpperCase();
    const testPasswordPlain = Math.random().toString(36).substring(2, 10).toUpperCase();

    const [hashedCandidatePw, hashedTestPw] = await Promise.all([
      bcrypt.hash(candidatePasswordPlain, 10),
      bcrypt.hash(testPasswordPlain, 10)
    ]);

    // Upsert candidate (create if not exists)
    const candidate = await prisma.candidate.upsert({
      where: {
        email_companyId: {
          email: candidateEmail,
          companyId
        }
      },
      update: {
        name: candidateName
      },
      create: {
        name: candidateName,
        email: candidateEmail,
        password: hashedCandidatePw,
        companyId,
        status: 'active'
      }
    });

    const writingTest = await prisma.writingTest.create({
      data: {
        title: title || 'Writing Assessment',
        description,
        candidateId: candidate.id,
        companyId,
        language,
        password: hashedTestPw
      }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';

    return sendSuccess(res, {
      testId: writingTest.id,
      testLink: `${frontendUrl}/candidate/writing-test/${writingTest.id}`,
      candidateId: candidate.id,
      candidateName,
      login: candidateEmail,
      password: candidatePasswordPlain,
      testPassword: testPasswordPlain
    }, 201);

  } catch (error) {
    logger.error('Error creating writing test:', error);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to create writing test', 500);
  }
});

// Get writing test by ID (for candidates)
router.get('/:testId', async (req, res) => {
  try {
    const { testId } = req.params;

    const writingTest = await prisma.writingTest.findUnique({
      where: { id: testId },
      include: {
        candidate: {
          select: { name: true, email: true }
        },
        responses: {
          include: {
            question: true
          }
        }
      }
    });

    if (!writingTest) {
      return sendError(res, 'NOT_FOUND', 'Writing test not found', 404);
    }

    // Get all active writing questions
    const questions = await prisma.writingQuestion.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    });

    return sendSuccess(res, {
      test: {
        id: writingTest.id,
        title: writingTest.title,
        description: writingTest.description,
        candidateName: writingTest.candidate.name,
        candidateEmail: writingTest.candidate.email,
        status: writingTest.status,
        timeLimit: writingTest.timeLimit,
        startedAt: writingTest.startedAt,
        completedAt: writingTest.completedAt
      },
      questions,
      responses: writingTest.responses
    });

  } catch (error) {
    logger.error('Error getting writing test:', error);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to get writing test', 500);
  }
});

// Authenticate and start writing test
router.post('/:testId/authenticate', async (req, res) => {
  try {
    const { testId } = req.params;
    const { password } = req.body;

    const writingTest = await prisma.writingTest.findUnique({
      where: { id: testId }
    });

    if (!writingTest) {
      return sendError(res, 'NOT_FOUND', 'Writing test not found', 404);
    }

    if (writingTest.status === 'completed') {
      return sendError(res, 'VALIDATION_ERROR', 'This test has already been completed', 400);
    }

    const isValidPassword = await bcrypt.compare(password, writingTest.password);
    if (!isValidPassword) {
      return sendError(res, 'UNAUTHORIZED', 'Invalid password', 401);
    }

    // Update test status to in_progress and set startedAt if not already set
    const updateData: any = {};
    if (writingTest.status === 'active') {
              updateData.status = 'active';
      updateData.startedAt = new Date();
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.writingTest.update({
        where: { id: testId },
        data: updateData
      });
    }

    return sendSuccess(res, { message: 'Authentication successful' });

  } catch (error) {
    logger.error('Error authenticating writing test:', error);
    return sendError(res, 'INTERNAL_ERROR', 'Authentication failed', 500);
  }
});

// Submit response for a question
router.post('/:testId/responses', async (req, res) => {
  try {
    const { testId } = req.params;
    const { questionId, answer, timeSpent } = req.body;

    if (!questionId || !answer) {
      return sendError(res, 'VALIDATION_ERROR', 'Question ID and answer are required', 400);
    }

    const writingTest = await prisma.writingTest.findUnique({
      where: { id: testId }
    });

    if (!writingTest) {
      return sendError(res, 'NOT_FOUND', 'Writing test not found', 404);
    }

    if (writingTest.status !== 'active') {
      return sendError(res, 'VALIDATION_ERROR', 'Test is not active', 400);
    }

    // Calculate word count
    const wordCount = answer.trim().split(/\s+/).length;

    // Upsert the response
    const response = await prisma.writingResponse.upsert({
      where: {
        testId_questionId: {
          testId,
          questionId
        }
      },
      update: {
        answer,
        wordCount,
        timeSpent: timeSpent || 0
      },
      create: {
        testId,
        questionId,
        answer,
        wordCount,
        timeSpent: timeSpent || 0
      }
    });

    return sendSuccess(res, { response });

  } catch (error) {
    logger.error('Error saving writing response:', error);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to save response', 500);
  }
});

// Submit writing test for evaluation
router.post('/:testId/submit', async (req, res) => {
  try {
    const { testId } = req.params;

    const writingTest = await prisma.writingTest.findUnique({
      where: { id: testId },
      include: {
        responses: {
          include: {
            question: true
          }
        }
      }
    });

    if (!writingTest) {
      return sendError(res, 'NOT_FOUND', 'Writing test not found', 404);
    }

    if (writingTest.status !== 'active') {
      return sendError(res, 'VALIDATION_ERROR', 'Test is not active', 400);
    }

    // Check if all questions have been answered
    const totalQuestions = await prisma.writingQuestion.count({ where: { isActive: true } });
    if (writingTest.responses.length < totalQuestions) {
      return sendError(res, 'VALIDATION_ERROR', 'Please answer all questions before submitting', 400);
    }

    // Update test status to completed
    await prisma.writingTest.update({
      where: { id: testId },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    });

    // Trigger AI evaluation (async)
    evaluateWritingTest(testId).catch(error => {
      logger.error('Error in writing test evaluation:', error);
    });

    return sendSuccess(res, { message: 'Writing test submitted successfully. Results will be available shortly.' });

  } catch (error) {
    logger.error('Error submitting writing test:', error);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to submit writing test', 500);
  }
});

// Get writing test result
router.get('/:testId/result', async (req, res) => {
  try {
    const { testId } = req.params;

    const result = await prisma.writingResult.findUnique({
      where: { testId },
      include: {
        test: {
          include: {
            responses: {
              include: {
                question: true
              }
            }
          }
        }
      }
    });

    if (!result) {
      return sendError(res, 'NOT_FOUND', 'Result not found. The test may still be processing.', 404);
    }

    return sendSuccess(res, { result });

  } catch (error) {
    logger.error('Error getting writing test result:', error);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to get result', 500);
  }
});

// Get company's writing tests (for company admin)
router.get('/company/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;
    const userCompanyId = (req as any).admin?.companyId;

    // Ensure user can only access their company's tests
    if (companyId !== userCompanyId) {
      return sendError(res, 'FORBIDDEN', 'Access denied', 403);
    }

    const writingTests = await prisma.writingTest.findMany({
      where: { companyId },
      include: {
        result: true,
        _count: {
          select: {
            responses: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return sendSuccess(res, { writingTests });

  } catch (error) {
    logger.error('Error getting company writing tests:', error);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to get writing tests', 500);
  }
});

// AI Evaluation function
async function evaluateWritingTest(testId: string) {
  try {
    const writingTest = await prisma.writingTest.findUnique({
      where: { id: testId },
      include: {
        responses: {
          include: {
            question: true
          },
          orderBy: {
            question: {
              order: 'asc'
            }
          }
        }
      }
    });

    if (!writingTest) {
      throw new Error('Writing test not found');
    }

    // Prepare prompt for OpenAI
    let prompt = `Please evaluate this CEFR-based writing assessment. The candidate completed 3 writing tasks:

`;

    writingTest.responses.forEach((response, index) => {
      prompt += `Task ${index + 1} - ${response.question.title}:
Question: ${response.question.prompt}
Answer: ${response.answer}
Word Count: ${response.wordCount}

`;
    });

    prompt += `Evaluate using this rubric (0-5, halves allowed e.g. 4.5):
| Criterion | Max | Weight% |
| Grammar & Syntax | 5 | 22.5 |
| Lexical Resource | 5 | 22.5 |
| Task Achievement | 5 | 20 |
| Coherence & Cohesion | 5 | 10 |
| Range of Structures | 5 | 15 |
| Spelling & Mechanics | 5 | 10 |

Scoring rules
• 0 = no evidence, 5 = expert level.  Use halves where appropriate (e.g. 4.5).
• Award 5 ONLY if the criterion is virtually error-free AND demonstrates advanced usage (e.g. complex subordination, near-native vocabulary, flawless mechanics, etc.).
• weightedAverage = Σ(score × weight%) / 100   → result is still on a 0–5 scale.

CEFR / Descriptor mapping (based on weightedAverage):
  0.0 – 1.0  → A1
  1.1 – 2.0 → A2
  2.1 – 3.0 → B1
  3.1 – 4.0 → B2  ("Competent Professional Writer")
  4.1 – 4.5 → C1
  4.6 – 5.0 → C2

Return ONLY JSON:
{
  "weightedAverage": 3.85,
  "cefrLevel": "B2",
  "criteria": {
    "grammar": 4,
    "lexicalResource": 4,
    "taskAchievement": 4,
    "coherenceCohesion": 3,
    "rangeStructures": 4,
    "spellingMechanics": 5
  },
  "feedback": "...",
  "taskAnalysis": { "task1": "…", "task2": "…", "task3": "…" }
}`;

    // Call OpenAI API (you'll need to implement this based on your existing AI service)
    const aiService = await import('../services/ai');
    const evaluationRaw = await aiService.evaluateWritingTest(prompt);

    // Sanitize and parse the response
    let evaluationString = evaluationRaw.trim();
    evaluationString = evaluationString.replace(/```json|```/gi, '').trim();

    let result;
    try {
      result = JSON.parse(evaluationString);
    } catch (parseErr) {
      logger.error('Failed to parse AI JSON for writing test', { evaluationString, parseErr });
      throw new Error('Invalid JSON from AI');
    }

    // Map new rubric keys to existing schema fields (scale 0-5 -> 0-100)
    const criteria = result.criteria || {};

    const to100 = (val: number | undefined) => typeof val === 'number' ? Math.round(val * 20) : 0;

    await prisma.writingResult.create({
      data: {
        testId,
        cefrLevel: result.cefrLevel,
        overallScore: Math.round((result.weightedAverage || 0) * 20),
        grammarScore: to100(criteria.grammar),
        coherenceScore: to100(criteria.coherenceCohesion),
        rangeScore: to100(criteria.rangeStructures),
        vocabularyScore: to100(criteria.lexicalResource),
        commandScore: to100(criteria.taskAchievement),
        feedback: result.feedback,
        detailedAnalysis: {
          criteria,
          taskAnalysis: result.taskAnalysis
        }
      }
    });

    // Consume credits now that the writing test is completed
    try {
      await creditService.consumeCredits(
        writingTest.companyId,
        TestType.WRITING,
        1,
        testId,
        'test_completion'
      );
    } catch (creditError) {
      console.error('Error consuming credits (Writing test completion):', creditError);
    }

    logger.info(`Writing test ${testId} evaluated successfully`);

  } catch (error) {
    logger.error(`Error evaluating writing test ${testId}:`, error);
    
    // Create a fallback result in case of AI failure
    await prisma.writingResult.create({
      data: {
        testId,
        cefrLevel: 'B1',
        overallScore: 60,
        grammarScore: 60,
        coherenceScore: 60,
        rangeScore: 60,
        vocabularyScore: 60,
        commandScore: 60,
        feedback: 'We encountered an issue processing your writing assessment. Please contact support for a manual review.',
        detailedAnalysis: {
          error: 'Automated evaluation failed',
          timestamp: new Date().toISOString()
        }
      }
    });
  }
}

export default router; 