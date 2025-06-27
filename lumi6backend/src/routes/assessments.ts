import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
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

// POST /api/assessments (accept multiple audio files, concatenate with ffmpeg, transcribe, evaluate, store result)
router.post('/', upload.any(), async (req, res) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  // Debug log: print all received files
  console.log('Received files:', req.files.map(f => f.originalname));

  const { execSync } = require('child_process');
  const convertedFiles: string[] = [];
  const assessmentId = Math.random().toString(36).substring(2, 10);
  let outputCombined = '';
  let transcript = '';
  let evaluation = {};
  let status = 'complete';
  let errorMsg = '';
  try {
    // 1. Convert all .webm to .ogg
    for (const file of req.files) {
      const inputPath = file.path;
      const outputPath = inputPath + '.ogg';
      execSync(`ffmpeg -y -i "${inputPath}" -acodec libvorbis "${outputPath}" -loglevel error`, {
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      convertedFiles.push(outputPath);
    }
    // 2. Create concat list file
    const concatListPath = path.join(uploadDir, `concat_list_${Date.now()}.txt`);
    fs.writeFileSync(concatListPath, convertedFiles.map(f => `file '${path.resolve(f)}'`).join('\n'));
    // 3. Concatenate
    outputCombined = path.join(uploadDir, `combined_${Date.now()}.ogg`);
    execSync(`ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${outputCombined}" -loglevel error`, {
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    // 4. Transcribe with Whisper (API or local)
    const { WhisperService } = await import('../services/whisperService');
    const transcriptionResult = await WhisperService.transcribeAudio(outputCombined);
    transcript = transcriptionResult.text;
    console.log('Transcript from Whisper:', transcript);

    // 5. Evaluate with OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const evalPrompt = `You are an English speaking test evaluator. Based on the transcript below, assign a CEFR level (A1, A2, B1, B2, C1, or C2), provide a score out of 100, and give detailed feedback. Also, rate the following metrics from 1 to 5: fluency, grammar, vocabulary, pronunciation, and coherence. Respond in the following JSON format:\n\n{\n  "cefr": "<CEFR level>",\n  "score": <score out of 100>,\n  "fluency": <1-5>,\n  "grammar": <1-5>,\n  "vocabulary": <1-5>,\n  "pronunciation": <1-5>,\n  "coherence": <1-5>,\n  "feedback": "<detailed feedback>"\n}\n\nTranscript:\n${transcript}`;
    const openaiResp = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an English speaking test evaluator.' },
        { role: 'user', content: evalPrompt }
      ]
    });
    console.log('OpenAI response:', openaiResp);
    try {
      evaluation = JSON.parse(openaiResp.choices[0].message?.content || '{}');
    } catch (e) {
      evaluation = { error: 'Failed to parse OpenAI response', raw: openaiResp.choices[0].message?.content };
    }
    console.log('Parsed evaluation:', evaluation);
    status = 'complete';
  } catch (err: any) {
    console.error('Error processing assessment:', err);
    status = 'error';
    errorMsg = err.message || 'Unknown error';
  }

  // 6. Store result as JSON
  const resultPath = path.join(uploadDir, `assessment_${assessmentId}.json`);
  const resultData = { assessmentId, transcript, evaluation, status, error: errorMsg };
  fs.writeFileSync(resultPath, JSON.stringify(resultData, null, 2));

  // 7. Respond with assessmentId
  res.json({ success: true, assessmentId, status });
});

// POST /api/assessments/concatenated (optimized single file upload with candidate test integration)
router.post('/concatenated', upload.single('audioFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }

  const { execSync } = require('child_process');
  const assessmentId = Math.random().toString(36).substring(2, 10);
  const { candidateTestId } = req.body; // Get candidateTestId from request body
  let transcript = '';
  let evaluation: any = {};
  let status = 'complete';
  let errorMsg = '';

  try {
    console.log('Processing single concatenated file:', req.file.filename);
    console.log('Request body:', req.body);
    console.log('CandidateTestId received:', candidateTestId);
    
    // 1. Convert to OGG if needed
    const inputPath = req.file.path;
    const outputPath = inputPath + '.ogg';
    execSync(`ffmpeg -y -i "${inputPath}" -acodec libvorbis "${outputPath}" -loglevel error`, { 
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    // 2. Transcribe with Whisper (API or local)
    const { WhisperService } = await import('../services/whisperService');
    const transcriptionResult = await WhisperService.transcribeAudio(outputPath);
    transcript = transcriptionResult.text;
    console.log('Transcript from concatenated file:', transcript);

    // 3. Evaluate with OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const evalPrompt = `You are an English speaking test evaluator. Based on the transcript below, assign a CEFR level (A1, A2, B1, B2, C1, or C2), provide a score out of 100, and give detailed feedback. Also, rate the following metrics from 1 to 5: fluency, grammar, vocabulary, pronunciation, and coherence. Respond in the following JSON format:\n\n{\n  "cefr": "<CEFR level>",\n  "score": <score out of 100>,\n  "fluency": <1-5>,\n  "grammar": <1-5>,\n  "vocabulary": <1-5>,\n  "pronunciation": <1-5>,\n  "coherence": <1-5>,\n  "feedback": "<detailed feedback>"\n}\n\nTranscript:\n${transcript}`;
    const openaiResp = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an English speaking test evaluator.' },
        { role: 'user', content: evalPrompt }
      ]
    });
    
    try {
      evaluation = JSON.parse(openaiResp.choices[0].message?.content || '{}');
    } catch (e) {
      evaluation = { error: 'Failed to parse OpenAI response', raw: openaiResp.choices[0].message?.content };
    }
    
    status = 'complete';

    // 4. If candidateTestId provided, update the database with results
    if (candidateTestId && evaluation.cefr && !evaluation.error) {
      try {
        console.log('Updating candidate test with results...');
        console.log('candidateTestId:', candidateTestId);
        console.log('evaluation:', evaluation);
        
        // Check if candidateTest exists
        const existingCandidateTest = await prisma.candidateTest.findUnique({
          where: { id: candidateTestId },
          include: { candidate: true }
        });
        
        if (!existingCandidateTest) {
          console.error('CandidateTest not found:', candidateTestId);
          // Try to find by candidate email if available
          const candidateEmail = req.body.candidateEmail;
          if (candidateEmail) {
            console.log('Trying to find candidate by email:', candidateEmail);
            const candidate = await prisma.candidate.findFirst({
              where: { email: candidateEmail },
              include: { tests: true }
            });
            if (candidate && candidate.tests.length > 0) {
              const latestTest = candidate.tests[candidate.tests.length - 1];
              console.log('Found alternative candidateTest:', latestTest.id);
              // Update the latest test
              await prisma.candidateTest.update({
                where: { id: latestTest.id },
                data: { 
                  status: 'completed',
                  completedAt: new Date()
                }
              });
              
              // Create test result
              await prisma.testResult.create({
                data: {
                  candidateTestId: latestTest.id,
                  cefrLevel: evaluation.cefr as any,
                  overallScore: evaluation.score || 0,
                  feedback: evaluation.feedback || '',
                  speakingScore: evaluation.score || 0,
                  fluencyScore: evaluation.fluency || 0,
                  pronunciationScore: evaluation.pronunciation || 0,
                  grammarScore: evaluation.grammar || 0,
                  vocabularyScore: evaluation.vocabulary || 0,
                  fullTranscription: transcript,
                  detailedAnalysis: {
                    fluency: evaluation.fluency,
                    grammar: evaluation.grammar,
                    vocabulary: evaluation.vocabulary,
                    pronunciation: evaluation.pronunciation,
                    coherence: evaluation.coherence,
                    feedback: evaluation.feedback
                  }
                }
              });
              
              // Update candidate status
              await prisma.candidate.update({
                where: { id: candidate.id },
                data: { status: 'completed' }
              });
              
              console.log('Database updated successfully using alternative candidateTest');
            }
          }
        } else {
          // Update candidate test status
          await prisma.candidateTest.update({
            where: { id: candidateTestId },
            data: { 
              status: 'completed',
              completedAt: new Date()
            }
          });

          // Create test result
          const testResult = await prisma.testResult.create({
            data: {
              candidateTestId: candidateTestId,
              cefrLevel: evaluation.cefr as any, // Cast to enum
              overallScore: evaluation.score || 0,
              feedback: evaluation.feedback || '',
              speakingScore: evaluation.score || 0,
              fluencyScore: evaluation.fluency || 0,
              pronunciationScore: evaluation.pronunciation || 0,
              grammarScore: evaluation.grammar || 0,
              vocabularyScore: evaluation.vocabulary || 0,
              fullTranscription: transcript,
              detailedAnalysis: {
                fluency: evaluation.fluency,
                grammar: evaluation.grammar,
                vocabulary: evaluation.vocabulary,
                pronunciation: evaluation.pronunciation,
                coherence: evaluation.coherence,
                feedback: evaluation.feedback
              }
            }
          });

          // Update candidate status to completed
          await prisma.candidate.update({
            where: { id: existingCandidateTest.candidateId },
            data: { status: 'completed' }
          });

          console.log('Database updated successfully with test result:', testResult.id);
        }
      } catch (dbError) {
        console.error('Error updating database:', dbError);
        // Don't fail the assessment if DB update fails, just log it
      }
    } else {
      console.log('Skipping database update - missing candidateTestId or evaluation failed');
      console.log('candidateTestId:', candidateTestId);
      console.log('evaluation.cefr:', evaluation.cefr);
      console.log('evaluation.error:', evaluation.error);
    }
    
  } catch (err: any) {
    console.error('Error processing concatenated assessment:', err);
    status = 'error';
    errorMsg = err.message || 'Unknown error';
  }

  // Store result as JSON (for backward compatibility)
  const resultPath = path.join(uploadDir, `assessment_${assessmentId}.json`);
  const resultData = { assessmentId, transcript, evaluation, status, error: errorMsg, candidateTestId };
  fs.writeFileSync(resultPath, JSON.stringify(resultData, null, 2));

  // Respond with assessmentId
  res.json({ success: true, assessmentId, status, transcript, evaluation });
});

// GET /api/assessments/:id (return real result if exists)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const resultPath = path.join(uploadDir, `assessment_${id}.json`);
  if (fs.existsSync(resultPath)) {
    const data = fs.readFileSync(resultPath, 'utf-8');
    res.json(JSON.parse(data));
  } else {
    res.status(404).json({ error: 'Assessment not found or not processed yet.' });
  }
});

// GET /api/assessments/:id/result (return only the result data for polling)
router.get('/:id/result', async (req, res) => {
  const { id } = req.params;
  const resultPath = path.join(uploadDir, `assessment_${id}.json`);
  if (fs.existsSync(resultPath)) {
    const data = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
    if (data.status === 'complete' && data.evaluation && data.evaluation.cefr) {
      // Return only the evaluation result for polling
      res.json({
        cefrLevel: data.evaluation.cefr,
        overallScore: data.evaluation.score,
        status: data.status,
        ready: true
      });
    } else {
      res.json({ ready: false, status: data.status || 'processing' });
    }
  } else {
    res.json({ ready: false, status: 'processing' });
  }
});

export default router; 