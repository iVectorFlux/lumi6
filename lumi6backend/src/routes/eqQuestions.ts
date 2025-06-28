import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// EQ Modules and Submodules configuration
const EQ_MODULES = {
  'goleman': {
    name: 'Goleman Model',
    submodules: [
      'self-awareness',
      'self-regulation', 
      'motivation',
      'empathy',
      'social-skills'
    ]
  },
  'msceit': {
    name: 'MSCEIT',
    submodules: [
      'emotion-perception',
      'emotion-facilitation',
      'emotion-understanding',
      'emotion-management'
    ]
  },
  'eq-i-2.0': {
    name: 'EQ-i 2.0',
    submodules: [
      'self-perception',
      'self-expression',
      'interpersonal',
      'decision-making',
      'stress-management'
    ]
  }
};

// GET /api/eq-questions - Get all EQ questions with filtering
router.get('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { 
      type, 
      module, 
      submodule, 
      isActive = 'true',
      page = '1', 
      limit = '50' 
    } = req.query;

    const where: any = {};
    
    if (type) where.type = type;
    if (module) where.module = module;
    if (submodule) where.submodule = submodule;
    if (isActive !== 'all') where.isActive = isActive === 'true';

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [questions, total] = await Promise.all([
      prisma.eQQuestion.findMany({
        where,
        skip,
        take,
        orderBy: [
          { module: 'asc' },
          { submodule: 'asc' },
          { type: 'asc' },
          { createdAt: 'desc' }
        ]
      }),
      prisma.eQQuestion.count({ where })
    ]);

    res.json({
      questions,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching EQ questions:', error);
    res.status(500).json({ error: 'Failed to fetch EQ questions' });
  }
});

// GET /api/eq-questions/modules - Get available modules and submodules
router.get('/modules', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    res.json({ modules: EQ_MODULES });
  } catch (error) {
    console.error('Error fetching EQ modules:', error);
    res.status(500).json({ error: 'Failed to fetch EQ modules' });
  }
});

// GET /api/eq-questions/stats - Get question bank statistics
router.get('/stats', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const [
      totalQuestions,
      likertQuestions,
      mcqQuestions,
      moduleStats,
      activeQuestions
    ] = await Promise.all([
      prisma.eQQuestion.count(),
      prisma.eQQuestion.count({ where: { type: 'likert' } }),
      prisma.eQQuestion.count({ where: { type: 'mcq' } }),
      prisma.eQQuestion.groupBy({
        by: ['module'],
        _count: { id: true }
      }),
      prisma.eQQuestion.count({ where: { isActive: true } })
    ]);

    res.json({
      totalQuestions,
      likertQuestions,
      mcqQuestions,
      activeQuestions,
      moduleStats: moduleStats.reduce((acc: Record<string, number>, stat: any) => {
        acc[stat.module] = stat._count.id;
        return acc;
      }, {} as Record<string, number>)
    });
  } catch (error) {
    console.error('Error fetching EQ question stats:', error);
    res.status(500).json({ error: 'Failed to fetch EQ question stats' });
  }
});

// POST /api/eq-questions - Create new EQ question
router.post('/', authenticateToken, requireSuperAdmin, async (req, res) => {
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
      scoring,
      mediaUrl
    } = req.body;

    // Validation
    if (!text || !type || !module || !submodule) {
      return res.status(400).json({ 
        error: 'Missing required fields: text, type, module, submodule' 
      });
    }

    if (!['likert', 'mcq'].includes(type)) {
      return res.status(400).json({ 
        error: 'Type must be either "likert" or "mcq"' 
      });
    }

    if (!EQ_MODULES[module as keyof typeof EQ_MODULES]) {
      return res.status(400).json({ 
        error: 'Invalid module. Must be one of: ' + Object.keys(EQ_MODULES).join(', ') 
      });
    }

    if (type === 'mcq' && !correctAnswer) {
      return res.status(400).json({ 
        error: 'MCQ questions must have a correct answer' 
      });
    }

    const question = await prisma.eQQuestion.create({
      data: {
        text,
        type,
        module,
        submodule,
        category: category || 'general',
        difficulty: difficulty || 'medium',
        options: options || null,
        correctAnswer: type === 'mcq' ? correctAnswer : null,
        normalizedScore: normalizedScore || 0,
        weight: weight || 1.0,
        scoring: scoring || null,
        mediaUrl: mediaUrl || null
      }
    });

    res.status(201).json({ question });
  } catch (error) {
    console.error('Error creating EQ question:', error);
    res.status(500).json({ error: 'Failed to create EQ question' });
  }
});

// POST /api/eq-questions/bulk-import - Bulk import EQ questions
router.post('/bulk-import', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Questions array is required' });
    }

    const createdQuestions = await prisma.$transaction(
      questions.map((q: any) => 
        prisma.eQQuestion.create({
          data: {
            text: q.text,
            type: q.type,
            module: q.module,
            submodule: q.submodule,
            category: q.category || 'general',
            difficulty: q.difficulty || 'medium',
            options: q.options || null,
            correctAnswer: q.type === 'mcq' ? q.correctAnswer : null,
            normalizedScore: q.normalizedScore || 0,
            weight: q.weight || 1.0,
            scoring: q.scoring || null,
            mediaUrl: q.mediaUrl || null
          }
        })
      )
    );

    res.status(201).json({ 
      message: `Successfully imported ${createdQuestions.length} questions`,
      questions: createdQuestions 
    });
  } catch (error) {
    console.error('Error bulk importing EQ questions:', error);
    res.status(500).json({ error: 'Failed to bulk import EQ questions' });
  }
});

// PUT /api/eq-questions/:id - Update EQ question
router.put('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
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
      scoring,
      mediaUrl,
      isActive
    } = req.body;

    // Validation
    if (!text || !type || !module || !submodule) {
      return res.status(400).json({ 
        error: 'Missing required fields: text, type, module, submodule' 
      });
    }

    if (!['likert', 'mcq'].includes(type)) {
      return res.status(400).json({ 
        error: 'Type must be either "likert" or "mcq"' 
      });
    }

    if (!EQ_MODULES[module as keyof typeof EQ_MODULES]) {
      return res.status(400).json({ 
        error: 'Invalid module. Must be one of: ' + Object.keys(EQ_MODULES).join(', ') 
      });
    }

    const question = await prisma.eQQuestion.update({
      where: { id },
      data: {
        text,
        type,
        module,
        submodule,
        category: category || 'general',
        difficulty: difficulty || 'medium',
        options: options || null,
        correctAnswer: type === 'mcq' ? correctAnswer : null,
        normalizedScore: normalizedScore || 0,
        weight: weight || 1.0,
        scoring: scoring || null,
        mediaUrl: mediaUrl || null,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    res.json({ question });
  } catch (error) {
    console.error('Error updating EQ question:', error);
    res.status(500).json({ error: 'Failed to update EQ question' });
  }
});

// DELETE /api/eq-questions/:id - Delete EQ question
router.delete('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if question has responses
    const responseCount = await prisma.eQResponse.count({
      where: { questionId: id }
    });

    if (responseCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete question with existing responses. Consider deactivating it instead.' 
      });
    }

    await prisma.eQQuestion.delete({
      where: { id }
    });

    res.json({ message: 'EQ question deleted successfully' });
  } catch (error) {
    console.error('Error deleting EQ question:', error);
    res.status(500).json({ error: 'Failed to delete EQ question' });
  }
});

// GET /api/eq-questions/export - Export EQ questions as CSV
router.get('/export', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const questions = await prisma.eQQuestion.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    // Convert to CSV format
    const csvHeader = 'ID,Text,Type,Module,Submodule,Category,Difficulty,Options,Correct Answer,Normalized Score,Weight,Media URL,Is Active,Created At\n';
    const csvRows = questions.map(q => 
      `"${q.id}","${q.text.replace(/"/g, '""')}","${q.type}","${q.module}","${q.submodule}","${q.category}","${q.difficulty}","${Array.isArray(q.options) ? q.options.join(';') : (q.options || '')}","${q.correctAnswer || ''}","${q.normalizedScore}","${q.weight}","${q.mediaUrl || ''}","${q.isActive}","${q.createdAt.toISOString()}"`
    ).join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="eq-questions.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting EQ questions:', error);
    res.status(500).json({ error: 'Failed to export EQ questions' });
  }
});

export default router; 