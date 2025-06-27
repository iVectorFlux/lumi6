import { CEFRLevel, EvaluationResult, ToolEvaluation } from '../types';
import fs from 'fs';
import OpenAI from 'openai';
import axios from 'axios';
import FormData from 'form-data';
import { spawn, exec } from 'child_process';

// Fix ffmpegPath type
const ffmpegPath: string = process.env.FFMPEG_PATH || 'ffmpeg';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface SpeechAnalysis {
  speechRate: number;
  pausePatterns: any[];
  intonationScore: number;
  accentDetection: string;
}

interface NLPAnalysis {
  posTags: any[];
  entities: any[];
  sentenceComplexity: number;
  grammarPatterns: any[];
}

// Get GPT model from environment or use default
const GPT_MODEL = process.env.OPENAI_GPT_MODEL || 'gpt-4o';

// Weighted average mapping for CEFR levels (including + bands)
const CEFR_NUMERIC_MAP: Record<string, number> = {
  'A1': 1,
  'A2': 2,
  'B1': 3,
  'B2': 4,
  'B2+': 4.5,
  'C1': 5,
  'C1+': 5.5,
  'C2': 6
};
const NUMERIC_CEFR_MAP = [
  { min: 1, max: 1.49, level: 'A1' },
  { min: 1.5, max: 2.49, level: 'A2' },
  { min: 2.5, max: 3.49, level: 'B1' },
  { min: 3.5, max: 4.24, level: 'B2' },
  { min: 4.25, max: 4.74, level: 'B2+' },
  { min: 4.75, max: 5.24, level: 'C1' },
  { min: 5.25, max: 5.74, level: 'C1+' },
  { min: 5.75, max: 6.1, level: 'C2' }
];

// New: Batch evaluation for multiple video questions
async function evaluateBatchWithGPT4(transcripts: string[]): Promise<any> {
  // Concatenate transcripts with labels
  let batchText = '';
  transcripts.forEach((t, i) => {
    batchText += `Q${i + 1}: ${t}\n`;
  });

  const prompt = `
You are a CEFR evaluation expert. Below are answers to multiple speaking questions from a candidate. For each answer (Q1, Q2, ...), briefly rate the CEFR level (A1–C2) and provide a short justification. Then, provide an overall CEFR level and justification for the candidate's speaking proficiency.

Return your result in this JSON format (do not include markdown or code fencing):
{
  "perQuestion": [
    { "question": "Q1", "cefrLevel": "B2", "justification": "..." },
    { "question": "Q2", "cefrLevel": "C1", "justification": "..." },
    ...
  ],
  "overall": {
    "cefrLevel": "B2+",
    "justification": "The candidate demonstrates upper-intermediate proficiency overall, with strong answers to most questions."
  }
}

Transcripts:
${batchText}
Respond ONLY with valid JSON.
  `;

  const response = await openai.chat.completions.create({
    model: GPT_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an expert English language assessor specializing in CEFR evaluation.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7
  });

  let raw = response.choices[0].message.content || '{}';
  raw = raw.replace(/```json|```/gi, '').trim();

  let analysis;
  try {
    analysis = JSON.parse(raw);
  } catch (err) {
    console.error('GPT-4 did not return valid JSON (batch):', response.choices[0].message.content);
    throw new Error('GPT-4 did not return valid JSON (batch)');
  }

  return analysis;
}

// Update processVideoAndEvaluate to accept an array of videoUrls and use batch evaluation
export async function processVideoAndEvaluate(videoUrls: string[] | string): Promise<any> {
  try {
    // Support both single and multiple videoUrls
    const urls = Array.isArray(videoUrls) ? videoUrls : [videoUrls];
    // 1. Transcribe all videos
    const transcripts = [];
    for (const url of urls) {
      const transcript = await transcribeVideo(url);
      transcripts.push(transcript);
    }
    // 2. Run batch evaluation
    const batchResult = await evaluateBatchWithGPT4(transcripts);
    // 3. Return the batch result (overall and per-question)
    return batchResult;
  } catch (error) {
    console.error('Error processing video(s):', error);
    throw new Error('Failed to process video(s) and evaluate');
  }
}

async function transcribeVideo(videoUrl: string): Promise<string> {
  try {
    // Extract audio from video using ffmpeg
    const audioPath = `${videoUrl}.wav`;
    const ffmpegProcess = spawn(ffmpegPath, [
      '-i', videoUrl,
      '-vn',  // No video
      '-acodec', 'pcm_s16le',  // PCM 16-bit
      '-ar', '16000',  // 16kHz sample rate
      '-ac', '1',  // Mono
      audioPath
    ]);

    await new Promise<void>((resolve, reject) => {
      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg process exited with code ${code}`));
        }
      });
    });

    // Use WhisperService to transcribe
    const { WhisperService } = await import('./whisperService');
    const transcriptionResult = await WhisperService.transcribeAudio(audioPath);
    const transcript = transcriptionResult.text;
    
    console.log('Transcription successful:', transcript.substring(0, 100) + '...');
    
    // Cleanup
    fs.unlinkSync(audioPath);
    
    return transcript;
  } catch (error) {
    console.error('Error transcribing video:', error);
    throw new Error('Failed to transcribe video');
  }
}

async function evaluateWithGPT4(transcription: string): Promise<ToolEvaluation> {
  const prompt = `
You are a CEFR evaluation expert. Rate the following transcript of a spoken monologue using CEFR levels (A1–C2).

Evaluate based on these 5 categories:
1. Fluency & Coherence
2. Vocabulary Range
3. Grammar Accuracy
4. Discourse Management
5. Ability to Express Opinions/Ideas

For each category, assign a CEFR level (A1, A2, B1, B2, C1, C2) and convert it to a score using this scale:
A1 = 1, A2 = 2, B1 = 3, B2 = 4, C1 = 5, C2 = 6

Sum the scores for a total out of 30 (5 categories × 6 max).

Map the total back to a final CEFR level using this scale:
6–10 → A1
11–14 → A2
15–18 → B1
19–20 → B2
21–24 → C1
25–30 → C2

If the candidate demonstrates advanced features in most categories, do not hesitate to assign C1 or C2, even if one category is slightly lower.

Also, provide:
- A list of strengths (what the candidate did well)
- A list of weaknesses (areas for improvement)

Return your result in this JSON format (do not include markdown or code fencing):
{
  "categoryLevels": {
    "fluency_coherence": { "level": "B2", "score": 4 },
    "vocabulary_range": { "level": "B2", "score": 4 },
    "grammar_accuracy": { "level": "B1", "score": 3 },
    "discourse_management": { "level": "B2", "score": 4 },
    "opinions_ideas": { "level": "B2", "score": 4 }
  },
  "totalScore": 19,
  "mappedCEFR": "B2",
  "strengths": ["Good range of vocabulary", "Clear structure"],
  "weaknesses": ["Minor grammar errors"],
  "justification": "The candidate demonstrated mostly upper-intermediate features across all categories, with some minor grammatical errors."
}

Transcript:
"${transcription}"
Respond ONLY with valid JSON.
  `;

  const response = await openai.chat.completions.create({
    model: GPT_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an expert English language assessor specializing in CEFR evaluation.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7
  });

  let raw = response.choices[0].message.content || '{}';
  raw = raw.replace(/```json|```/gi, '').trim();

  let analysis;
  try {
    analysis = JSON.parse(raw);
  } catch (err) {
    console.error('GPT-4 did not return valid JSON:', response.choices[0].message.content);
    throw new Error('GPT-4 did not return valid JSON');
  }

  return {
    tool: 'gpt4',
    cefrLevel: mapToCEFRLevel(analysis.mappedCEFR),
    confidence: analysis.confidence,
    strengths: analysis.strengths || [],
    weaknesses: analysis.weaknesses || [],
    details: {
      ...analysis.detailedAnalysis,
      categoryLevels: analysis.categoryLevels,
      totalScore: analysis.totalScore,
      justification: analysis.justification
    }
  };
}

function mapToCEFRLevel(level: string): CEFRLevel {
  const levelMap: { [key: string]: CEFRLevel } = {
    'A1': CEFRLevel.A1,
    'A2': CEFRLevel.A2,
    'B1': CEFRLevel.B1,
    'B2': CEFRLevel.B2,
    'C1': CEFRLevel.C1,
    'C2': CEFRLevel.C2
  };

  return levelMap[level] || CEFRLevel.A1;
}

// Mock function to create test evaluation data
// New function for writing test evaluation
export async function evaluateWritingTest(prompt: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert English language assessor specializing in CEFR-based writing evaluation. You provide detailed, accurate assessments of written work.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3 // Lower temperature for more consistent evaluation
    });

    let result = response.choices[0].message.content;
    if (!result) {
      throw new Error('No response from OpenAI');
    }

    // Remove markdown code fences if present
    result = result.replace(/```json|```/gi, '').trim();

    return result;
  } catch (error) {
    console.error('Error in writing test evaluation:', error);
    throw new Error('Failed to evaluate writing test with AI');
  }
}

function createMockEvaluation(transcription: string): EvaluationResult {
  // Calculate a simple score based on transcription length
  const length = transcription.length;
  const baseScore = Math.min(95, Math.max(60, Math.floor(length / 20)));
  
  // Create a mock ToolEvaluation for each tool
  const mockToolEval = (tool: string): ToolEvaluation => ({
    tool,
    cefrLevel: length > 500 ? CEFRLevel.C1 : length > 300 ? CEFRLevel.B2 : length > 200 ? CEFRLevel.B1 : CEFRLevel.A2,
    confidence: 0.8,
    strengths: ["Good vocabulary"],
    weaknesses: ["Some grammar issues"],
    details: {}
  });

  return {
    cefrLevel: mockToolEval('mock').cefrLevel,
    overallScore: baseScore,
    speakingScore: baseScore,
    fluencyScore: baseScore - 5,
    pronunciationScore: baseScore - 3,
    grammarScore: baseScore + 2,
    vocabularyScore: baseScore + 3,
    feedback: `This is a mock evaluation for testing. Transcription length: ${length} characters.`,
    detailedAnalysis: {
      strengths: ["Good vocabulary", "Clear speech"],
      weaknesses: ["Some grammar issues", "Occasional pronunciation errors"],
      recommendations: ["Practice more", "Focus on grammar"],
      grammarErrors: [],
      vocabularyUsage: [],
      pronunciationIssues: [],
      toolEvaluations: [
        mockToolEval('correctly'),
        mockToolEval('spacy'),
        mockToolEval('nltk'),
        mockToolEval('gpt4')
      ]
    },
    confidenceScore: 80,
    toolBreakdown: {
      correctly: mockToolEval('correctly'),
      spacy: mockToolEval('spacy'),
      nltk: mockToolEval('nltk'),
      gpt4: mockToolEval('gpt4')
    }
  };
}