export interface Admin {
  id: string;
  email: string;
  name: string;
}

export interface Test {
  id: string;
  adminId: string;
  createdAt: Date;
  status: 'active' | 'completed' | 'expired';
}

export interface Candidate {
  id: string;
  testId: string;
  name: string;
  email: string;
  status: 'pending' | 'in_progress' | 'completed';
  result?: TestResult;
}

export interface TestResult {
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  overallScore: number;
  feedback: string;
  speakingScore: number;
  fluencyScore: number;
  pronunciationScore: number;
  grammarScore: number;
  vocabularyScore: number;
  timestamp: Date;
}

export interface Question {
  id: string;
  type: 'introduction' | 'picture_description' | 'situation' | 'opinion';
  text: string;
  imageUrl?: string;
  preparationTime: number;
  responseTime: number;
}

// New types for the assessment system

export interface CandidateInfo {
  id: string;
  name: string;
  email: string;
}

export interface RecordedResponse {
  questionId: string;
  questionText: string;
  recording: Blob;
  duration: number;
}

export interface AssessmentResult {
  id: string;
  candidateName: string;
  candidateEmail?: string;
  submittedAt: string;
  status: 'processing' | 'completed' | 'error';
  cefrLevel?: string;
  overallScore?: number;
  
  // Detailed scores
  grammarScore?: number;
  vocabularyScore?: number;
  fluencyScore?: number;
  pronunciationScore?: number;
  coherenceScore?: number;
  
  // Feedback
  grammarFeedback?: string;
  vocabularyFeedback?: string;
  fluencyFeedback?: string;
  pronunciationFeedback?: string;
  coherenceFeedback?: string;
  
  // Response details
  responses?: ResponseDetail[];
}

export interface ResponseDetail {
  questionId: string;
  questionText: string;
  transcription: string;
  analysis: string;
  audioUrl?: string;
}

// CEFR level descriptions
export interface CEFRLevelDetail {
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  title: string;
  description: string;
  skills: {
    speaking?: string;
    listening?: string;
    reading?: string;
    writing?: string;
  };
}

export const CEFR_LEVELS: Record<string, CEFRLevelDetail> = {
  'A1': {
    level: 'A1',
    title: 'Beginner',
    description: 'Can understand and use familiar everyday expressions and very basic phrases aimed at the satisfaction of needs of a concrete type.',
    skills: {
      speaking: 'Can interact in a simple way provided the other person talks slowly and clearly and is prepared to help.'
    }
  },
  'A2': {
    level: 'A2',
    title: 'Elementary',
    description: 'Can understand sentences and frequently used expressions related to areas of most immediate relevance.',
    skills: {
      speaking: 'Can communicate in simple and routine tasks requiring a simple and direct exchange of information on familiar and routine matters.'
    }
  },
  'B1': {
    level: 'B1',
    title: 'Intermediate',
    description: 'Can understand the main points of clear standard input on familiar matters regularly encountered in work, school, leisure, etc.',
    skills: {
      speaking: 'Can deal with most situations likely to arise while travelling in an area where the language is spoken.'
    }
  },
  'B2': {
    level: 'B2',
    title: 'Upper Intermediate',
    description: 'Can understand the main ideas of complex text on both concrete and abstract topics, including technical discussions in their field of specialization.',
    skills: {
      speaking: 'Can interact with a degree of fluency and spontaneity that makes regular interaction with native speakers quite possible without strain for either party.'
    }
  },
  'C1': {
    level: 'C1',
    title: 'Advanced',
    description: 'Can understand a wide range of demanding, longer texts, and recognize implicit meaning.',
    skills: {
      speaking: 'Can express ideas fluently and spontaneously without much obvious searching for expressions.'
    }
  },
  'C2': {
    level: 'C2',
    title: 'Proficient',
    description: 'Can understand with ease virtually everything heard or read.',
    skills: {
      speaking: 'Can express themselves spontaneously, very fluently and precisely, differentiating finer shades of meaning even in the most complex situations.'
    }
  }
}; 