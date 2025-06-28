export enum CEFRLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2'
}

export interface ToolEvaluation {
  tool: string;
  cefrLevel: CEFRLevel;
  confidence: number;
  strengths: string[];
  weaknesses: string[];
  details: any;
}

export interface GrammarAnalysis {
  errors: {
    error: string;
    correction: string;
    explanation: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  patterns: {
    type: string;
    examples: string[];
    frequency: number;
  }[];
  score: number;
}

export interface VocabularyAnalysis {
  words: {
    word: string;
    context: string;
    level: CEFRLevel;
    frequency: number;
  }[];
  diversity: number;
  complexity: number;
  score: number;
}

export interface SpeechAnalysis {
  rate: number;
  pauses: {
    position: number;
    duration: number;
  }[];
  intonation: number;
  accent: string;
  score: number;
}

export interface DetailedAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  grammarErrors: {
    error: string;
    correction: string;
    explanation: string;
  }[];
  vocabularyUsage: {
    word: string;
    context: string;
    level: CEFRLevel;
  }[];
  pronunciationIssues: {
    word: string;
    issue: string;
    suggestion: string;
  }[];
  speechPatterns?: {
    rate: number;
    intonation: number;
    accent: string;
  };
  languageComplexity?: {
    sentenceComplexity: number;
    grammarPatterns: any[];
  };
  toolEvaluations: ToolEvaluation[];
}

export interface EvaluationResult {
  cefrLevel: CEFRLevel;
  overallScore: number;
  speakingScore: number;
  fluencyScore: number;
  pronunciationScore: number;
  grammarScore: number;
  vocabularyScore: number;
  feedback: string;
  detailedAnalysis: DetailedAnalysis;
  confidenceScore: number;
  toolBreakdown: {
    correctly: ToolEvaluation;
    spacy: ToolEvaluation;
    nltk: ToolEvaluation;
    gpt4: ToolEvaluation;
  };
} 