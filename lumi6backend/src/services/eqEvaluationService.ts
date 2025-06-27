import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface EQResponse {
  questionId: string;
  answer: string;
  score: number;
  question: {
    module: string;
    submodule: string;
    type: string;
    inconsistencyPairId?: string;
    isReversed: boolean;
  };
}

interface ModuleScore {
  score: number;
  submodules: Record<string, number>;
}

interface InconsistencyPair {
  question1Id: string;
  question2Id: string;
  score1: number;
  score2: number;
  inconsistencyScore: number;
  question1Text: string;
  question2Text: string;
}

interface EvaluationResult {
  overallScore: number;
  eqRating: string;
  moduleScores: Record<string, ModuleScore>;
  inconsistencyIndex: number;
  inconsistencyRating: string;
  inconsistencyPairs: InconsistencyPair[];
}

export class EQEvaluationService {
  
  /**
   * Main evaluation function that calculates all scores and inconsistency metrics
   */
  static async evaluateEQTest(responses: EQResponse[]): Promise<EvaluationResult> {
    // 1. Calculate module and submodule scores
    const moduleScores = this.calculateModuleScores(responses);
    
    // 2. Calculate overall EQ score
    const overallScore = this.calculateOverallScore(moduleScores);
    
    // 3. Get EQ rating based on score
    const eqRating = this.getEQRating(overallScore);
    
    // 4. Calculate inconsistency metrics
    const inconsistencyResult = await this.calculateInconsistencyMetrics(responses);
    
    return {
      overallScore,
      eqRating,
      moduleScores,
      inconsistencyIndex: inconsistencyResult.index,
      inconsistencyRating: inconsistencyResult.rating,
      inconsistencyPairs: inconsistencyResult.pairs
    };
  }

  /**
   * Calculate scores for each module and submodule
   */
  private static calculateModuleScores(responses: EQResponse[]): Record<string, ModuleScore> {
    const moduleData: Record<string, Record<string, number[]>> = {};
    
    // Group responses by module and submodule
    responses.forEach(response => {
      const { module, submodule } = response.question;
      
      if (!moduleData[module]) {
        moduleData[module] = {};
      }
      
      if (!moduleData[module][submodule]) {
        moduleData[module][submodule] = [];
      }
      
      moduleData[module][submodule].push(response.score);
    });
    
    // Calculate averages
    const moduleScores: Record<string, ModuleScore> = {};
    
    Object.entries(moduleData).forEach(([module, submodules]) => {
      const submoduleScores: Record<string, number> = {};
      const submoduleAverages: number[] = [];
      
      Object.entries(submodules).forEach(([submodule, scores]) => {
        const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        submoduleScores[submodule] = Math.round(average * 100) / 100;
        submoduleAverages.push(average);
      });
      
      const moduleAverage = submoduleAverages.reduce((sum, avg) => sum + avg, 0) / submoduleAverages.length;
      
      moduleScores[module] = {
        score: Math.round(moduleAverage * 100) / 100,
        submodules: submoduleScores
      };
    });
    
    return moduleScores;
  }

  /**
   * Calculate overall EQ score as average of all module scores
   */
  private static calculateOverallScore(moduleScores: Record<string, ModuleScore>): number {
    const moduleAverages = Object.values(moduleScores).map(module => module.score);
    const overall = moduleAverages.reduce((sum, score) => sum + score, 0) / moduleAverages.length;
    return Math.round(overall * 100) / 100;
  }

  /**
   * Get EQ rating based on score range
   */
  private static getEQRating(score: number): string {
    if (score >= 90) return 'Exceptional EQ';
    if (score >= 75) return 'High EQ';
    if (score >= 60) return 'Moderate EQ';
    if (score >= 40) return 'Developing EQ';
    return 'Needs Improvement';
  }

  /**
   * Calculate inconsistency metrics for paired questions
   */
  private static async calculateInconsistencyMetrics(responses: EQResponse[]): Promise<{
    index: number;
    rating: string;
    pairs: InconsistencyPair[];
  }> {
    const inconsistencyPairs: InconsistencyPair[] = [];
    const responseMap = new Map<string, EQResponse>();
    
    // Create a map for quick lookup
    responses.forEach(response => {
      responseMap.set(response.questionId, response);
    });
    
    // Find paired questions and calculate inconsistencies
    for (const response of responses) {
      const { inconsistencyPairId, isReversed } = response.question;
      
      if (inconsistencyPairId && responseMap.has(inconsistencyPairId)) {
        const pairedResponse = responseMap.get(inconsistencyPairId)!;
        
        // Only calculate once per pair (avoid duplicates)
        if (response.questionId < inconsistencyPairId) {
          const score1 = response.score;
          const score2 = pairedResponse.score;
          
          // Calculate inconsistency: |Score_Q1 - (100 - Score_Q2)| for reversed pairs
          let inconsistencyScore: number;
          if (isReversed || pairedResponse.question.isReversed) {
            inconsistencyScore = Math.abs(score1 - (100 - score2));
          } else {
            // For non-reversed pairs, expect similar scores
            inconsistencyScore = Math.abs(score1 - score2);
          }
          
          // Get question texts
          const question1 = await prisma.eQQuestion.findUnique({
            where: { id: response.questionId },
            select: { text: true }
          });
          
          const question2 = await prisma.eQQuestion.findUnique({
            where: { id: inconsistencyPairId },
            select: { text: true }
          });
          
          inconsistencyPairs.push({
            question1Id: response.questionId,
            question2Id: inconsistencyPairId,
            score1,
            score2,
            inconsistencyScore: Math.round(inconsistencyScore * 100) / 100,
            question1Text: question1?.text || '',
            question2Text: question2?.text || ''
          });
        }
      }
    }
    
    // Calculate inconsistency index
    const inconsistencyIndex = inconsistencyPairs.length > 0
      ? inconsistencyPairs.reduce((sum, pair) => sum + pair.inconsistencyScore, 0) / inconsistencyPairs.length
      : 0;
    
    const roundedIndex = Math.round(inconsistencyIndex * 100) / 100;
    const inconsistencyRating = this.getInconsistencyRating(roundedIndex);
    
    return {
      index: roundedIndex,
      rating: inconsistencyRating,
      pairs: inconsistencyPairs
    };
  }

  /**
   * Get inconsistency rating based on index score
   */
  private static getInconsistencyRating(index: number): string {
    if (index <= 15) return 'Very consistent';
    if (index <= 30) return 'Mild inconsistency';
    if (index <= 50) return 'Noticeable inconsistency';
    return 'Highly inconsistent/unreliable';
  }

  /**
   * Convert Likert scale (1-5) to 0-100 scale
   */
  static convertLikertToScore(likertValue: number): number {
    // Map 1-5 to 0-100 linearly
    return ((likertValue - 1) / 4) * 100;
  }

  /**
   * Save evaluation results to database
   */
  static async saveEvaluationResult(
    testId: string,
    candidateId: string,
    responses: any[],
    evaluation: EvaluationResult
  ): Promise<string> {
    const result = await prisma.eQResult.create({
      data: {
        testId,
        candidateId,
        overallScore: evaluation.overallScore,
        eqRating: evaluation.eqRating,
        moduleScores: evaluation.moduleScores as any,
        submoduleScores: this.extractSubmoduleScores(evaluation.moduleScores) as any,
        inconsistencyIndex: evaluation.inconsistencyIndex,
        inconsistencyRating: evaluation.inconsistencyRating,
        inconsistencyPairs: evaluation.inconsistencyPairs as any,
        completedAt: new Date(),
        responses: {
          create: responses.map((response: any) => ({
            questionId: response.questionId,
            answer: response.answer,
            score: response.score
          }))
        }
      }
    });
    
    return result.id;
  }

  /**
   * Extract submodule scores for separate storage
   */
  private static extractSubmoduleScores(moduleScores: Record<string, ModuleScore>): Record<string, number> {
    const submoduleScores: Record<string, number> = {};
    
    Object.entries(moduleScores).forEach(([module, moduleData]) => {
      Object.entries(moduleData.submodules).forEach(([submodule, score]) => {
        submoduleScores[`${module}_${submodule}`] = score;
      });
    });
    
    return submoduleScores;
  }

  /**
   * Get detailed analysis for a completed test
   */
  static async getDetailedAnalysis(resultId: string): Promise<any> {
    const result = await prisma.eQResult.findUnique({
      where: { id: resultId },
      include: {
        responses: {
          include: {
            question: true
          }
        },
        test: true,
        candidate: true
      }
    });

    if (!result) {
      throw new Error('Result not found');
    }

    return {
      candidate: {
        name: result.candidate.name,
        email: result.candidate.email
      },
      test: {
        title: result.test.title,
        completedAt: result.completedAt
      },
      scores: {
        overall: result.overallScore,
        rating: result.eqRating,
        modules: result.moduleScores,
        submodules: result.submoduleScores
      },
      consistency: {
        index: result.inconsistencyIndex,
        rating: result.inconsistencyRating,
        pairs: result.inconsistencyPairs
      },
      responses: result.responses.map((response: any) => ({
        question: response.question.text,
        answer: response.answer,
        score: response.score,
        module: response.question.module,
        submodule: response.question.submodule
      }))
    };
  }
}

export default EQEvaluationService; 