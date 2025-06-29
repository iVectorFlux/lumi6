import express from 'express';
import { PrismaClient, TestStatus, TestType } from '@prisma/client';
import EQEvaluationService from '../services/eqEvaluationService';
import { validateCreditsAndPermissions, consumeCreditsAfterTest } from '../middleware/creditValidation';
import { creditService } from '../services/creditService';

const router = express.Router();
const prisma = new PrismaClient();

// Get all EQ questions with filtering and pagination
router.get('/questions', async (req, res) => {
  try {
    const {
      type,
      module,
      submodule,
      status,
      search,
      page = '1',
      limit = '10'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};
    
    if (type) where.type = type;
    if (module) where.module = module;
    if (submodule) where.submodule = submodule;
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    
    if (search) {
      where.OR = [
        { text: { contains: search as string, mode: 'insensitive' } },
        { category: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [questions, total] = await Promise.all([
      prisma.eQQuestion.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.eQQuestion.count({ where })
    ]);

    res.json({
      questions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching EQ questions:', error);
    res.status(500).json({ error: 'Failed to fetch EQ questions' });
  }
});

// Create new EQ question
router.post('/questions', async (req, res) => {
  try {
    const {
      text,
      type,
      module,
      submodule,
      category,
      difficulty,
      options,
      correctAnswer,
      normalizedScore,
      weight,
      inconsistencyPairId,
      isReversed,
      scoring,
      mediaUrl
    } = req.body;

    // Validation
    if (!text || !type || !module || !submodule) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['likert', 'mcq'].includes(type)) {
      return res.status(400).json({ error: 'Invalid question type' });
    }

    const question = await prisma.eQQuestion.create({
      data: {
        text,
        type,
        module,
        submodule,
        category: category || 'general',
        difficulty: difficulty || 'medium',
        options: options || [],
        correctAnswer: correctAnswer || null,
        normalizedScore: normalizedScore || 100,
        weight: weight || 1.0,
        inconsistencyPairId: inconsistencyPairId || null,
        isReversed: isReversed || false,
        scoring: scoring || {},
        mediaUrl: mediaUrl || null
      }
    });

    res.status(201).json(question);
  } catch (error) {
    console.error('Error creating EQ question:', error);
    res.status(500).json({ error: 'Failed to create EQ question' });
  }
});

// Update EQ question
router.put('/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const question = await prisma.eQQuestion.update({
      where: { id },
      data: updateData
    });

    res.json(question);
  } catch (error) {
    console.error('Error updating EQ question:', error);
    res.status(500).json({ error: 'Failed to update EQ question' });
  }
});

// Delete EQ question
router.delete('/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if question has responses
    const responseCount = await prisma.eQResponse.count({
      where: { questionId: id }
    });

    if (responseCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete question with existing responses' 
      });
    }

    await prisma.eQQuestion.delete({
      where: { id }
    });

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting EQ question:', error);
    res.status(500).json({ error: 'Failed to delete EQ question' });
  }
});

// Get available modules and submodules
router.get('/questions/modules', async (req, res) => {
  try {
    const modules = await prisma.eQQuestion.groupBy({
      by: ['module', 'submodule'],
      where: { isActive: true },
      _count: { id: true }
    });

    const moduleMap: Record<string, string[]> = {};
    modules.forEach(item => {
      if (!moduleMap[item.module]) {
        moduleMap[item.module] = [];
      }
      if (!moduleMap[item.module].includes(item.submodule)) {
        moduleMap[item.module].push(item.submodule);
      }
    });

    res.json(moduleMap);
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

// Get question bank statistics
router.get('/questions/stats', async (req, res) => {
  try {
    const [
      totalQuestions,
      activeQuestions,
      questionsByType,
      questionsByModule,
      inconsistencyPairs
    ] = await Promise.all([
      prisma.eQQuestion.count(),
      prisma.eQQuestion.count({ where: { isActive: true } }),
      prisma.eQQuestion.groupBy({
        by: ['type'],
        _count: { id: true }
      }),
      prisma.eQQuestion.groupBy({
        by: ['module'],
        _count: { id: true }
      }),
      prisma.eQQuestion.count({
        where: { inconsistencyPairId: { not: null } }
      })
    ]);

    res.json({
      total: totalQuestions,
      active: activeQuestions,
      inactive: totalQuestions - activeQuestions,
      byType: questionsByType.reduce((acc: any, item) => {
        acc[item.type] = item._count.id;
        return acc;
      }, {}),
      byModule: questionsByModule.reduce((acc: any, item) => {
        acc[item.module] = item._count.id;
        return acc;
      }, {}),
      inconsistencyPairs: Math.floor(inconsistencyPairs / 2)
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Bulk import questions
router.post('/questions/bulk-import', async (req, res) => {
  try {
    const { questions } = req.body;

    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: 'Questions must be an array' });
    }

    const results = [];
    for (const questionData of questions) {
      try {
        const question = await prisma.eQQuestion.create({
          data: {
            text: questionData.text,
            type: questionData.type,
            module: questionData.module,
            submodule: questionData.submodule,
            category: questionData.category || 'general',
            difficulty: questionData.difficulty || 'medium',
            options: questionData.options || [],
            correctAnswer: questionData.correctAnswer || null,
            normalizedScore: questionData.normalizedScore || 100,
            weight: questionData.weight || 1.0,
            inconsistencyPairId: questionData.inconsistencyPairId || null,
            isReversed: questionData.isReversed || false,
            scoring: questionData.scoring || {}
          }
        });
        results.push({ success: true, question });
      } catch (error: any) {
        results.push({ success: false, error: error.message, data: questionData });
      }
    }

    res.json({ results });
  } catch (error) {
    console.error('Error bulk importing questions:', error);
    res.status(500).json({ error: 'Failed to bulk import questions' });
  }
});

// Create EQ test with candidate
router.post('/tests/create', 
  validateCreditsAndPermissions(TestType.EQ),
  async (req, res) => {
  try {
    const { candidateName, candidateEmail, companyId } = req.body;

    if (!candidateName || !candidateEmail || !companyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if candidate already exists
    let candidate = await prisma.candidate.findFirst({
      where: {
        email: candidateEmail,
        companyId: companyId
      }
    });

    // Create candidate if doesn't exist
    if (!candidate) {
      // Generate a random password for the candidate
      const password = Math.random().toString(36).slice(-8);
      
              candidate = await prisma.candidate.create({
          data: {
            name: candidateName,
            email: candidateEmail,
            password: password, // In production, this should be hashed
            companyId: companyId
          }
        });
    }

    // Create EQ test
    const test = await prisma.eQTest.create({
      data: {
        title: `EQ Assessment for ${candidateName}`,
        description: 'Comprehensive Emotional Intelligence Assessment',
        companyId: companyId
      }
    });

    // Generate test credentials
    const password = Math.random().toString(36).slice(-8);

    // Create test link
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const testLink = `${baseUrl}/eq-test/${test.id}?candidate=${candidate.id}`;

    res.status(201).json({
      testId: test.id,
      candidateId: candidate.id,
      password,
      testLink,
      candidateName,
      candidateEmail
    });
  } catch (error) {
    console.error('Error creating EQ test:', error);
    res.status(500).json({ error: 'Failed to create EQ test' });
  }
});

// Create EQ test
router.post('/tests', async (req, res) => {
  try {
    const { title, description, companyId } = req.body;

    const test = await prisma.eQTest.create({
      data: {
        title,
        description,
        companyId
      }
    });

    res.status(201).json(test);
  } catch (error) {
    console.error('Error creating EQ test:', error);
    res.status(500).json({ error: 'Failed to create EQ test' });
  }
});

// Get EQ tests
router.get('/tests', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    const tests = await prisma.eQTest.findMany({
      where: companyId ? { companyId: companyId as string } : {},
      include: {
        _count: {
          select: { results: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tests);
  } catch (error) {
    console.error('Error fetching EQ tests:', error);
    res.status(500).json({ error: 'Failed to fetch EQ tests' });
  }
});

// Start EQ test (get questions)
router.get('/tests/:testId/questions', async (req, res) => {
  try {
    const { testId } = req.params;
    const password = req.headers['x-test-password'] as string;

    // Simple password validation (in production, use proper authentication)
    if (!password || password.length < 6) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Get test details
    const test = await prisma.eQTest.findUnique({
      where: { id: testId, isActive: true }
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Get active questions (all 80 questions)
    const questions = await prisma.eQQuestion.findMany({
      where: { isActive: true },
      select: {
        id: true,
        text: true,
        type: true,
        module: true,
        submodule: true,
        options: true,
        mediaUrl: true
      },
      orderBy: { id: 'asc' } // Ensure consistent order
    });

    res.json({
      test: {
        id: test.id,
        title: test.title,
        description: test.description
      },
      questions,
      totalQuestions: questions.length
    });
  } catch (error) {
    console.error('Error fetching test questions:', error);
    res.status(500).json({ error: 'Failed to fetch test questions' });
  }
});

// Submit EQ test responses
router.post('/tests/:testId/submit', async (req, res) => {
  const { testId } = req.params;
  const { candidateId, responses } = req.body;
  
  try {

    if (!candidateId || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate test exists
    const test = await prisma.eQTest.findUnique({
      where: { id: testId, isActive: true }
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Get questions with full details for evaluation
    const questionIds = responses.map((r: any) => r.questionId);
    const questions = await prisma.eQQuestion.findMany({
      where: { id: { in: questionIds } }
    });

    // Calculate scores for each response
    const scoredResponses = responses.map((response: any) => {
      const question = questions.find(q => q.id === response.questionId);
      if (!question) throw new Error(`Question ${response.questionId} not found`);

      let score = 0;
      if (question.type === 'likert') {
        // Convert Likert scale answer to score (0-100)
        const likertMapping: Record<string, number> = {
          'Strongly Disagree': 0,
          'Disagree': 25, 
          'Neutral': 50,
          'Agree': 75,
          'Strongly Agree': 100
        };
        
        score = likertMapping[response.answer] ?? 50; // Default to neutral if not found
        
        // If the question is reversed, invert the score
        if (question.isReversed) {
          score = 100 - score;
        }
      } else if (question.type === 'mcq') {
        // Check if answer is correct
        score = response.answer === question.correctAnswer ? 100 : 0;
      }

      return {
        questionId: response.questionId,
        answer: response.answer,
        score,
        question: {
          module: question.module,
          submodule: question.submodule,
          type: question.type,
          inconsistencyPairId: question.inconsistencyPairId || undefined,
          isReversed: question.isReversed
        }
      };
    });

    console.log('About to evaluate EQ test with', scoredResponses.length, 'responses');
    
    // Evaluate the test using the evaluation service
    const evaluation = await EQEvaluationService.evaluateEQTest(scoredResponses);
    console.log('EQ evaluation completed:', {
      overallScore: evaluation.overallScore,
      moduleCount: Object.keys(evaluation.moduleScores).length,
      inconsistencyPairs: evaluation.inconsistencyPairs.length
    });

    // Save results to database
    console.log('About to save evaluation result to database');
    const resultId = await EQEvaluationService.saveEvaluationResult(
      testId,
      candidateId,
      scoredResponses,
      evaluation
    );

    // Consume credit now that the test is completed
    try {
      const creditResult = await creditService.consumeCredits(
        test.companyId,
        TestType.EQ,
        1,
        resultId,
        'test_completion'
      );

      if (!creditResult.success) {
        console.error('Failed to consume EQ test credits after completion:', creditResult.error);
      }
    } catch (creditError) {
      console.error('Error consuming credits (EQ test completion):', creditError);
    }

    console.log('Successfully saved result with ID:', resultId);

    res.json({
      resultId,
      evaluation: {
        overallScore: evaluation.overallScore,
        eqRating: evaluation.eqRating,
        moduleScores: evaluation.moduleScores,
        inconsistencyIndex: evaluation.inconsistencyIndex,
        inconsistencyRating: evaluation.inconsistencyRating
      }
    });
  } catch (error: any) {
    console.error('Error submitting EQ test:', error);
    console.error('Error details:', {
      message: error?.message || 'Unknown error',
      testId: testId,
      candidateId: candidateId,
      responseCount: req.body.responses?.length || 0
    });
    res.status(500).json({ 
      error: 'Failed to submit EQ test',
      details: error?.message || 'Unknown error'
    });
  }
});

// Get EQ test result
router.get('/results/:resultId', async (req, res) => {
  try {
    const { resultId } = req.params;
    
    const analysis = await EQEvaluationService.getDetailedAnalysis(resultId);
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching EQ result:', error);
    res.status(500).json({ error: 'Failed to fetch EQ result' });
  }
});

// Get EQ results
router.get('/results', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    const results = await prisma.eQResult.findMany({
      where: {
        test: companyId ? { companyId: companyId as string } : {}
      },
      include: {
        candidate: {
          select: { name: true, email: true }
        },
        test: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(results);
  } catch (error) {
    console.error('Error fetching EQ results:', error);
    res.status(500).json({ error: 'Failed to fetch EQ results' });
  }
});

export default router; 