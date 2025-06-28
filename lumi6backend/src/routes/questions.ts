import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth';
import { z } from 'zod';
import { sendSuccess, sendError } from '../utils/apiResponse';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schema for creating/updating questions
const questionSchema = z.object({
  text: z.string().min(3, 'Question text must be at least 3 characters'),
  type: z.string().min(1, 'Question type is required'),
  category: z.string().min(1, 'Category is required'),
  difficulty: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  mediaUrl: z.string().optional()
});

// Validation schema for batch operations
const batchQuestionsSchema = z.array(questionSchema);

/**
 * Create a new question
 * POST /api/questions
 */
router.post('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    if (!req.admin) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }
    const adminId = req.admin.id;
    const validation = questionSchema.safeParse(req.body);
    
    if (!validation.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Validation failed', 400);
    }
    
    const { text, type, category, difficulty, mediaUrl } = validation.data;
    
    const question = await prisma.speakingQuestion.create({
      data: {
        text,
        type,
        category,
        difficulty,
        mediaUrl,
        adminId
      }
    });
    
    sendSuccess(res, question, 201);
  } catch (error) {
    console.error('Error creating question:', error);
    sendError(res, 'CREATE_ERROR', 'Failed to create question', 500);
  }
});

/**
 * Get all questions (with filtering)
 * GET /api/questions
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (!req.admin) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }
    const adminId = req.admin.id;
    const { type, category, difficulty, search } = req.query;
    
    const where: any = { adminId };
    
    // Apply filters if provided
    if (type) where.type = type;
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (search) {
      where.text = {
        contains: search,
        mode: 'insensitive'
      };
    }
    
    const questions = await prisma.speakingQuestion.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    sendSuccess(res, questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    sendError(res, 'FETCH_ERROR', 'Failed to fetch questions', 500);
  }
});

/**
 * Get a single question by ID
 * GET /api/questions/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.admin) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }
    const { id } = req.params;
    const adminId = req.admin.id;
    
    const question = await prisma.speakingQuestion.findFirst({
      where: {
        id,
        adminId
      }
    });
    
    if (!question) {
      return sendError(res, 'NOT_FOUND', 'Question not found', 404);
    }
    
    sendSuccess(res, question);
  } catch (error) {
    console.error('Error fetching question:', error);
    sendError(res, 'FETCH_ERROR', 'Failed to fetch question', 500);
  }
});

/**
 * Update a question
 * PUT /api/questions/:id
 */
router.put('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    if (!req.admin) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }
    const { id } = req.params;
    const adminId = req.admin.id;
    
    const validation = questionSchema.safeParse(req.body);
    
    if (!validation.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Validation failed', 400);
    }
    
    const { text, type, category, difficulty, mediaUrl } = validation.data;
    
    // Check if question exists and belongs to the admin
    const existingQuestion = await prisma.speakingQuestion.findFirst({
      where: {
        id,
        adminId
      }
    });
    
    if (!existingQuestion) {
      return sendError(res, 'NOT_FOUND', 'Question not found', 404);
    }
    
    // Update the question
    const updatedQuestion = await prisma.speakingQuestion.update({
      where: { id },
      data: {
        text,
        type,
        category,
        difficulty,
        mediaUrl
      }
    });
    
    sendSuccess(res, updatedQuestion);
  } catch (error) {
    console.error('Error updating question:', error);
    sendError(res, 'UPDATE_ERROR', 'Failed to update question', 500);
  }
});

/**
 * Delete a question
 * DELETE /api/questions/:id
 */
router.delete('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    if (!req.admin) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }
    const { id } = req.params;
    const adminId = req.admin.id;
    
    // Check if question exists and belongs to the admin
    const existingQuestion = await prisma.speakingQuestion.findFirst({
      where: {
        id,
        adminId
      }
    });
    
    if (!existingQuestion) {
      return sendError(res, 'NOT_FOUND', 'Question not found', 404);
    }
    
    // Check if question is used in any tests
    const usedInTests = await prisma.testQuestion.findFirst({
      where: {
        questionId: id
      }
    });
    
    if (usedInTests) {
      return sendError(res, 'CONSTRAINT_ERROR', 'Question cannot be deleted because it is used in one or more tests', 400);
    }
    
    // Delete the question
    await prisma.speakingQuestion.delete({
      where: { id }
    });
    
    sendSuccess(res, { message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    sendError(res, 'DELETE_ERROR', 'Failed to delete question', 500);
  }
});

/**
 * Get question categories
 * GET /api/questions/meta/categories
 */
router.get('/meta/categories', authenticateToken, async (req, res) => {
  try {
    if (!req.admin) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }
    const adminId = req.admin.id;
    
    // Get unique categories from admin's questions
    const categories = await prisma.speakingQuestion.findMany({
      where: { adminId },
      select: { category: true },
      distinct: ['category']
    });
    
    sendSuccess(res, categories.map(c => c.category));
  } catch (error) {
    console.error('Error fetching categories:', error);
    sendError(res, 'FETCH_ERROR', 'Failed to fetch categories', 500);
  }
});

/**
 * Get question types
 * GET /api/questions/meta/types
 */
router.get('/meta/types', authenticateToken, async (req, res) => {
  try {
    if (!req.admin) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }
    const adminId = req.admin.id;
    
    // Get unique types from admin's questions
    const types = await prisma.speakingQuestion.findMany({
      where: { adminId },
      select: { type: true },
      distinct: ['type']
    });
    
    sendSuccess(res, types.map(t => t.type));
  } catch (error) {
    console.error('Error fetching types:', error);
    sendError(res, 'FETCH_ERROR', 'Failed to fetch types', 500);
  }
});

/**
 * Export all questions for an admin
 * GET /api/questions/export
 */
router.get('/export/all', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    if (!req.admin) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }
    const adminId = req.admin.id;
    
    // Get all questions for the admin
    const questions = await prisma.speakingQuestion.findMany({
      where: { adminId },
      orderBy: {
        category: 'asc',
      },
      select: {
        text: true,
        type: true,
        category: true,
        difficulty: true,
        mediaUrl: true,
      }
    });
    
    sendSuccess(res, questions);
  } catch (error) {
    console.error('Error exporting questions:', error);
    sendError(res, 'EXPORT_ERROR', 'Failed to export questions', 500);
  }
});

/**
 * Import batch questions
 * POST /api/questions/import
 */
router.post('/import', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    if (!req.admin) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }
    const adminId = req.admin.id;
    const validation = batchQuestionsSchema.safeParse(req.body);
    
    if (!validation.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Validation failed', 400);
    }
    
    const questionsToImport = validation.data;
    
    // Create all questions in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const createdQuestions = [];
      const errors = [];
      
      for (let i = 0; i < questionsToImport.length; i++) {
        const question = questionsToImport[i];
        try {
          const created = await tx.speakingQuestion.create({
            data: {
              ...question,
              adminId
            }
          });
          createdQuestions.push(created);
        } catch (error: any) {
          errors.push({
            index: i,
            question: question.text,
            error: `Failed to import question: ${error?.message || 'Unknown error'}`
          });
        }
      }
      
      return { createdQuestions, errors };
    });
    
    sendSuccess(res, {
      message: `Imported ${results.createdQuestions.length} questions`,
      successCount: results.createdQuestions.length,
      errorCount: results.errors.length,
      errors: results.errors
    });
  } catch (error) {
    console.error('Error importing questions:', error);
    sendError(res, 'IMPORT_ERROR', 'Failed to import questions', 500);
  }
});

/**
 * Public endpoint: Get a set of 5 questions for the candidate test
 * GET /api/questions/candidate-set
 * - First question: always lowest difficulty (A1) and type 'introduction'
 * - Remaining 4: random, not 'introduction', mixed types/difficulties
 * - Each question can include mediaUrl (for images)
 * - No authentication required
 */
router.get('/candidate-set', async (req, res) => {
  try {
    // 1. Get the intro question (A1, introduction, must have text)
    const intro = await prisma.speakingQuestion.findFirst({
      where: { type: 'introduction', difficulty: 'A1', NOT: { text: '' } },
      orderBy: { createdAt: 'asc' }
    });
    if (!intro) {
      return sendError(res, 'NOT_FOUND', 'No introduction question found', 404);
    }
    // 2. Get all other questions (not introduction, must have text)
    const others = await prisma.speakingQuestion.findMany({
      where: { NOT: [{ type: 'introduction' }, { text: '' }] },
    });
    // 3. Filter out any question missing text (defensive)
    const validOthers = others.filter(q => q.text && q.text.trim().length > 0);
    // 4. Shuffle and pick 4 random
    const shuffled = validOthers.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 4);
    // 5. Return intro + selected (max 5 questions)
    const result = [intro, ...selected].slice(0, 5);
    console.log('Returning candidate-set questions:', result.length);
    sendSuccess(res, result);
  } catch (error) {
    console.error('Error fetching candidate question set:', error);
    sendError(res, 'FETCH_ERROR', 'Failed to fetch candidate question set', 500);
  }
});

/**
 * Get proficiency questions for company
 * GET /api/questions/proficiency
 */
router.get('/proficiency', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    if (!req.admin) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }

    const questions = await prisma.globalProficiencyQuestion.findMany({
      where: {
        OR: [
          { companyId: req.admin.companyId },
          { companyId: null } // Global questions
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    sendSuccess(res, questions);
  } catch (error) {
    console.error('Error fetching proficiency questions:', error);
    sendError(res, 'FETCH_ERROR', 'Failed to fetch proficiency questions', 500);
  }
});

/**
 * Get question statistics
 * GET /api/questions/stats
 */
router.get('/stats', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    if (!req.admin) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }
    const adminId = req.admin.id;
    
    const [
      totalQuestions,
      activeQuestions,
      questionsByType,
      questionsByDifficulty,
      questionsByLanguage
    ] = await Promise.all([
      prisma.speakingQuestion.count({ where: { adminId } }),
      prisma.speakingQuestion.count({ where: { adminId } }), // All speaking questions are considered active
      prisma.speakingQuestion.groupBy({
        by: ['type'],
        where: { adminId },
        _count: { id: true }
      }),
      prisma.speakingQuestion.groupBy({
        by: ['difficulty'],
        where: { adminId },
        _count: { id: true }
      }),
      prisma.speakingQuestion.groupBy({
        by: ['language'],
        where: { adminId },
        _count: { id: true }
      })
    ]);

    const stats = {
      totalQuestions,
      activeQuestions,
      byType: questionsByType.reduce((acc: Record<string, number>, stat: any) => {
        acc[stat.type] = stat._count.id;
        return acc;
      }, {} as Record<string, number>),
      byDifficulty: questionsByDifficulty.reduce((acc: Record<string, number>, stat: any) => {
        acc[stat.difficulty] = stat._count.id;
        return acc;
      }, {} as Record<string, number>),
      byLanguage: questionsByLanguage.reduce((acc: Record<string, number>, stat: any) => {
        acc[stat.language || 'en'] = stat._count.id;
        return acc;
      }, {} as Record<string, number>)
    };
    
    sendSuccess(res, stats);
  } catch (error) {
    console.error('Error fetching question stats:', error);
    sendError(res, 'STATS_ERROR', 'Failed to fetch question statistics', 500);
  }
});

/**
 * Export questions as CSV
 * GET /api/questions/export
 */
router.get('/export', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    if (!req.admin) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }
    const adminId = req.admin.id;
    
    const questions = await prisma.speakingQuestion.findMany({
      where: { adminId },
      orderBy: { createdAt: 'desc' }
    });
    
    // Convert to CSV format
    const csvHeader = 'ID,Text,Type,Category,Difficulty,Language,Media URL,Created At\n';
    const csvRows = questions.map(q => 
      `"${q.id}","${q.text.replace(/"/g, '""')}","${q.type}","${q.category}","${q.difficulty}","${q.language || 'en'}","${q.mediaUrl || ''}","${q.createdAt.toISOString()}"`
    ).join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="speaking-questions.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting questions:', error);
    sendError(res, 'EXPORT_ERROR', 'Failed to export questions', 500);
  }
});

/**
 * Bulk import questions
 * POST /api/questions/bulk-import
 */
router.post('/bulk-import', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    if (!req.admin) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }
    const adminId = req.admin.id;
    const { questions } = req.body;
    
    if (!Array.isArray(questions) || questions.length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'Questions array is required', 400);
    }
    
    const createdQuestions = await prisma.$transaction(
      questions.map((q: any) => 
        prisma.speakingQuestion.create({
          data: {
            text: q.text,
            type: q.type || 'mcq',
            category: q.category || 'general',
            difficulty: q.difficulty || 'medium',
            mediaUrl: q.mediaUrl || null,
            language: q.language || 'en',
            adminId
          }
        })
      )
    );
    
    sendSuccess(res, {
      message: `Successfully imported ${createdQuestions.length} questions`,
      questions: createdQuestions
    });
  } catch (error) {
    console.error('Error bulk importing questions:', error);
    sendError(res, 'IMPORT_ERROR', 'Failed to bulk import questions', 500);
  }
});

export default router; 