export enum CEFRLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2'
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
  detailedAnalysis: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    grammarErrors: Array<{
      error: string;
      correction: string;
      explanation: string;
    }>;
    vocabularyUsage: Array<{
      word: string;
      context: string;
      level: CEFRLevel;
    }>;
    pronunciationIssues: Array<{
      word: string;
      issue: string;
      suggestion: string;
    }>;
  };
  confidenceScore: number;
} 