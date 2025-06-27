import express from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { sendSuccess, sendError, sendValidationError } from '../utils/apiResponse';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/questions/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Validation schemas
const proficiencyQuestionSchema = z.object({
  text: z.string().min(1),
  type: z.string().min(1),
  category: z.string().min(1),
  difficulty: z.string().min(1),
  options: z.string().optional(),
  correctAnswer: z.string().optional(),
  score: z.number().optional(),
  mediaUrl: z.string().optional(),
  mediaAudio: z.string().optional(),
  mediaImage: z.string().optional(),
});

const eqQuestionSchema = z.object({
  text: z.string().min(1),
  type: z.enum(['likert', 'mcq']),
  module: z.enum(['goleman', 'msceit', 'eq-i-2.0']),
  submodule: z.string().min(1),
  category: z.string().min(1),
  difficulty: z.string().min(1),
  options: z.string().optional(),
  correctAnswer: z.string().optional(),
  normalizedScore: z.number().default(0),
  weight: z.number().default(1.0),
  scoring: z.string().optional(),
  mediaUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  inconsistencyPairId: z.string().optional(),
  isReversed: z.boolean().default(false),
});

// Helper function to parse CSV/Excel files
async function parseFile(filePath: string, fileType: string): Promise<Record<string, any>[]> {
  if (fileType === 'csv') {
    return new Promise((resolve, reject) => {
      const results: Record<string, any>[] = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data: Record<string, any>) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  } else {
    // Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
  }
}

// Helper function to clean up uploaded file
function cleanupFile(filePath: string) {
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    console.error('Error cleaning up file:', error);
  }
}

// Download sample templates
router.get('/templates/:type', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    
    let sampleData: any[] = [];
    let filename = '';

    if (type === 'proficiency') {
      filename = 'proficiency_questions_template.csv';
      sampleData = [
        {
          text: 'What is the capital of France?',
          type: 'multiple_choice',
          category: 'geography',
          difficulty: 'A1',
          options: '["Paris", "London", "Berlin", "Madrid"]',
          correctAnswer: 'Paris',
          score: 1,
          mediaUrl: '',
          mediaAudio: '',
          mediaImage: ''
        },
        {
          text: 'Complete the sentence: I _____ to school every day.',
          type: 'fill_blank',
          category: 'grammar',
          difficulty: 'A2',
          options: '["go", "goes", "going", "went"]',
          correctAnswer: 'go',
          score: 1,
          mediaUrl: '',
          mediaAudio: '',
          mediaImage: ''
        }
      ];
    } else if (type === 'eq') {
      filename = 'eq_questions_template.csv';
      sampleData = [
        {
          text: 'I reflect on my emotional responses after conflicts.',
          type: 'likert',
          module: 'goleman',
          submodule: 'self-awareness',
          category: 'emotional_intelligence',
          difficulty: 'intermediate',
          options: '',
          correctAnswer: '',
          normalizedScore: 0,
          weight: 1.0,
          scoring: '{"Strongly Disagree": 0, "Disagree": 25, "Neutral": 50, "Agree": 75, "Strongly Agree": 100}',
          mediaUrl: '',
          isActive: true,
          inconsistencyPairId: '',
          isReversed: false
        },
        {
          text: 'Which emotion is typically associated with success?',
          type: 'mcq',
          module: 'msceit',
          submodule: 'emotion-perception',
          category: 'emotional_intelligence',
          difficulty: 'intermediate',
          options: '["Sadness", "Joy", "Anger", "Fear"]',
          correctAnswer: 'Joy',
          normalizedScore: 0,
          weight: 1.0,
          scoring: '',
          mediaUrl: '',
          isActive: true,
          inconsistencyPairId: '',
          isReversed: false
        }
      ];
    } else {
      return sendError(res, 'INVALID_TYPE', 'Invalid template type', 400);
    }

    // Convert to CSV
    const csvContent = [
      Object.keys(sampleData[0]).join(','),
      ...sampleData.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value
        ).join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Error generating template:', error);
    sendError(res, 'TEMPLATE_ERROR', 'Failed to generate template', 500);
  }
});

// Upload proficiency questions
router.post('/proficiency', authenticateToken, requireSuperAdmin, upload.single('file'), async (req, res) => {
  let filePath = '';
  
  try {
    if (!req.admin) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }

    if (!req.file) {
      return sendError(res, 'NO_FILE', 'No file uploaded', 400);
    }

    filePath = req.file.path;
    const fileType = req.file.mimetype.includes('csv') ? 'csv' : 'excel';
    
    // Parse the uploaded file
    const rawData = await parseFile(filePath, fileType);
    
    if (!rawData || rawData.length === 0) {
      return sendError(res, 'EMPTY_FILE', 'File is empty or invalid', 400);
    }

    // Validate and process questions
    const validQuestions: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < rawData.length; i++) {
      try {
        const row = rawData[i];
        
        // Parse JSON fields
        if (row.options && typeof row.options === 'string') {
          try {
            row.options = JSON.parse(row.options);
          } catch {
            row.options = null;
          }
        }

        // Convert score to number
        if (row.score) {
          row.score = parseInt(row.score) || 0;
        }

        const validatedQuestion = proficiencyQuestionSchema.parse(row);
        validQuestions.push({
          ...validatedQuestion,
          companyId: req.admin.companyId
        });
      } catch (error: any) {
        errors.push({
          row: i + 1,
          error: error instanceof z.ZodError ? error.errors : error.message
        });
      }
    }

    if (validQuestions.length === 0) {
      return sendValidationError(res, { message: 'No valid questions found', errors });
    }

    // Insert questions into database
    const createdQuestions = await prisma.$transaction(async (tx) => {
      const results: any[] = [];
      for (const question of validQuestions) {
        const created = await tx.globalProficiencyQuestion.create({
          data: question
        });
        results.push(created);
      }
      return results;
    });

    sendSuccess(res, {
      message: `Successfully imported ${createdQuestions.length} proficiency questions`,
      imported: createdQuestions.length,
      errors: errors.length > 0 ? errors : undefined
    }, 201);

  } catch (error) {
    console.error('Error uploading proficiency questions:', error);
    sendError(res, 'UPLOAD_ERROR', 'Failed to upload questions', 500);
  } finally {
    if (filePath) {
      cleanupFile(filePath);
    }
  }
});

// Upload EQ questions
router.post('/eq', authenticateToken, requireSuperAdmin, upload.single('file'), async (req, res) => {
  let filePath = '';
  
  try {
    if (!req.admin) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }

    if (!req.file) {
      return sendError(res, 'NO_FILE', 'No file uploaded', 400);
    }

    filePath = req.file.path;
    const fileType = req.file.mimetype.includes('csv') ? 'csv' : 'excel';
    
    // Parse the uploaded file
    const rawData = await parseFile(filePath, fileType);
    
    if (!rawData || rawData.length === 0) {
      return sendError(res, 'EMPTY_FILE', 'File is empty or invalid', 400);
    }

    // Validate and process questions
    const validQuestions: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < rawData.length; i++) {
      try {
        const row = rawData[i];
        
        // Parse JSON fields
        if (row.options && typeof row.options === 'string') {
          try {
            row.options = JSON.parse(row.options);
          } catch {
            row.options = null;
          }
        }

        if (row.scoring && typeof row.scoring === 'string') {
          try {
            row.scoring = JSON.parse(row.scoring);
          } catch {
            row.scoring = null;
          }
        }

        // Convert boolean fields
        row.isActive = row.isActive === 'true' || row.isActive === true;
        row.isReversed = row.isReversed === 'true' || row.isReversed === true;

        // Convert numeric fields
        row.normalizedScore = parseInt(row.normalizedScore) || 0;
        row.weight = parseFloat(row.weight) || 1.0;

        const validatedQuestion = eqQuestionSchema.parse(row);
        validQuestions.push({
          ...validatedQuestion,
          companyId: req.admin.companyId
        });
      } catch (error: any) {
        errors.push({
          row: i + 1,
          error: error instanceof z.ZodError ? error.errors : error.message
        });
      }
    }

    if (validQuestions.length === 0) {
      return sendValidationError(res, { message: 'No valid questions found', errors });
    }

    // Insert questions into database
    const createdQuestions = await prisma.$transaction(async (tx) => {
      const results: any[] = [];
      for (const question of validQuestions) {
        const created = await tx.eQQuestion.create({
          data: question
        });
        results.push(created);
      }
      return results;
    });

    sendSuccess(res, {
      message: `Successfully imported ${createdQuestions.length} EQ questions`,
      imported: createdQuestions.length,
      errors: errors.length > 0 ? errors : undefined
    }, 201);

  } catch (error) {
    console.error('Error uploading EQ questions:', error);
    sendError(res, 'UPLOAD_ERROR', 'Failed to upload questions', 500);
  } finally {
    if (filePath) {
      cleanupFile(filePath);
    }
  }
});

export default router; 