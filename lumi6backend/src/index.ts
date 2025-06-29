import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import testRoutes from './routes/tests';
import candidateRoutes from './routes/candidates';
import evaluateRoutes from './routes/evaluate';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { spawn } from 'child_process';
import questionRoutes from './routes/questions';

import analyticsRoutes from './routes/analytics';
import assessmentsRoutes from './routes/assessments';
import superadminRoutes from './routes/superadmin';
import companyadminRoutes from './routes/companyadmin';
import companiesRoutes from './routes/companies';
import proficiencyTestsRoutes from './routes/proficiencyTests';
import eqRoutes from './routes/eqRoutes';
import questionUploadRoutes from './routes/questionUpload';
import writingTestsRoutes from './routes/writingTests';
import creditRoutes from './routes/credits';
import eqQuestionsRoutes from './routes/eqQuestions';


// Import security and logging middleware
import { 
  securityHeaders, 
  apiRateLimit, 
  authRateLimit, 
  uploadRateLimit,
  assessmentRateLimit,
  sanitizeInput,
  validateFileUpload,
  corsOptions 
} from './middleware/security';
import { requestLogger, logInfo, logError } from './utils/logger';

dotenv.config();
// OpenAI API configuration loaded

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 4000;

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Security Middleware
app.use(securityHeaders);
app.use(requestLogger);
app.use(sanitizeInput);

// CORS Configuration
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use('/uploads', express.static(uploadDir));

// Add session recovery middleware
import sessionRecoveryService from './services/sessionRecovery';

// Run idle session recovery every hour
setInterval(async () => {
  try {
    const recoveredCount = await sessionRecoveryService.recoverIdleSessions(60);
    if (recoveredCount > 0) {
      console.log(`Recovered ${recoveredCount} idle test sessions`);
    }
  } catch (error) {
    console.error('Error in idle session recovery:', error);
  }
}, 60 * 60 * 1000); // Run every hour

// Routes with rate limiting
app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/tests', apiRateLimit, testRoutes);
app.use('/api/candidates', apiRateLimit, candidateRoutes);
// // app.use('/api/questions', apiRateLimit, questionRoutes);

app.use('/api/evaluate', uploadRateLimit, validateFileUpload, evaluateRoutes);
// app.use('/api/analytics', apiRateLimit, analyticsRoutes);
app.use('/api/assessments', assessmentRateLimit, validateFileUpload, assessmentsRoutes);
app.use('/api/superadmin', apiRateLimit, superadminRoutes);
app.use('/api/companyadmin', authRateLimit, companyadminRoutes);
app.use('/api/companies', apiRateLimit, companiesRoutes);
app.use('/api/proficiency-tests', apiRateLimit, proficiencyTestsRoutes);
app.use('/api/eq', apiRateLimit, eqRoutes);
app.use('/api/question-upload', uploadRateLimit, validateFileUpload, questionUploadRoutes);
app.use('/api/writing-tests', apiRateLimit, writingTestsRoutes);
app.use('/api/credits', apiRateLimit, creditRoutes);
app.use('/api/eq-questions', apiRateLimit, eqQuestionsRoutes);


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('DETAILED ERROR IN MIDDLEWARE:');
  console.error(err);
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message,
    stack: err.stack,
    
    details: err.details || 'No additional details'
  });
});

app.listen(port, () => {
  logInfo(`Server started successfully on port ${port}`, {
    environment: process.env.NODE_ENV || 'development',
    port,
    timestamp: new Date().toISOString(),
  });
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🔒 Security headers enabled`);
  console.log(`📝 Request logging enabled`);
}); 