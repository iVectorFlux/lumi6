import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Get analytics overview for an admin
 * GET /api/analytics/overview
 */
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const adminId = req.admin?.id;

    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get tests created by this admin
    const testsCount = await prisma.test.count({
      where: { adminId }
    });

    // Get total candidates who have taken tests
    const candidatesCount = await prisma.candidate.count({
      where: {
        tests: {
          some: {
            test: {
              adminId
            }
          }
        }
      }
    });

    // Get total completed tests
    const completedTestsCount = await prisma.candidateTest.count({
      where: {
        test: {
          adminId
        },
        status: 'completed'
      }
    });

    // Get question bank size
    const questionsCount = await prisma.speakingQuestion.count({
      where: { adminId }
    });

    // Get distribution of CEFR levels in results
    const levelDistribution = await prisma.testResult.groupBy({
      by: ['cefrLevel'],
      where: {
        candidateTest: {
          test: {
            adminId
          }
        }
      },
      _count: true
    });

    // Format the level distribution data
    const formattedLevelDistribution = levelDistribution.reduce<Record<string, number>>((acc, item) => {
      acc[item.cefrLevel] = item._count;
      return acc;
    }, {});

    res.json({
      testsCount,
      candidatesCount,
      completedTestsCount,
      questionsCount,
      levelDistribution: formattedLevelDistribution
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * Get score distributions across test results
 * GET /api/analytics/scores
 */
router.get('/scores', authenticateToken, async (req, res) => {
  try {
    const adminId = req.admin?.id;

    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get distribution of overall scores
    const results = await prisma.testResult.findMany({
      where: {
        candidateTest: {
          test: {
            adminId
          }
        }
      },
      select: {
        overallScore: true,
        speakingScore: true,
        fluencyScore: true,
        pronunciationScore: true,
        grammarScore: true,
        vocabularyScore: true,
        cefrLevel: true
      }
    });

    // Calculate statistical data for different metrics
    const calculateStats = (scores: number[]): { min: number; max: number; avg: number } => {
      if (scores.length === 0) return { min: 0, max: 0, avg: 0 };
      
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      const sum = scores.reduce((a, b) => a + b, 0);
      const avg = Math.round((sum / scores.length) * 10) / 10; // Round to 1 decimal
      
      return { min, max, avg };
    };

    // Extract scores for each metric
    const overallScores = results.map(r => r.overallScore);
    const speakingScores = results.map(r => r.speakingScore);
    const fluencyScores = results.map(r => r.fluencyScore);
    const pronunciationScores = results.map(r => r.pronunciationScore);
    const grammarScores = results.map(r => r.grammarScore);
    const vocabularyScores = results.map(r => r.vocabularyScore);

    // Calculate score distribution by level
    const scoresByLevel: Record<string, any> = {};
    results.forEach((result) => {
      const level = result.cefrLevel;
      if (!scoresByLevel[level]) {
        scoresByLevel[level] = {
          count: 0,
          overallScores: [] as number[],
          speakingScores: [] as number[],
          fluencyScores: [] as number[],
          pronunciationScores: [] as number[],
          grammarScores: [] as number[],
          vocabularyScores: [] as number[],
        };
      }
      scoresByLevel[level].count++;
      scoresByLevel[level].overallScores.push(result.overallScore);
      scoresByLevel[level].speakingScores.push(result.speakingScore);
      scoresByLevel[level].fluencyScores.push(result.fluencyScore);
      scoresByLevel[level].pronunciationScores.push(result.pronunciationScore);
      scoresByLevel[level].grammarScores.push(result.grammarScore);
      scoresByLevel[level].vocabularyScores.push(result.vocabularyScore);
    });

    // Calculate stats for each level
    for (const level in scoresByLevel) {
      const data = scoresByLevel[level];
      scoresByLevel[level] = {
        count: data.count,
        overall: calculateStats(data.overallScores),
        speaking: calculateStats(data.speakingScores),
        fluency: calculateStats(data.fluencyScores),
        pronunciation: calculateStats(data.pronunciationScores),
        grammar: calculateStats(data.grammarScores),
        vocabulary: calculateStats(data.vocabularyScores)
      };
    }

    res.json({
      totalResults: results.length,
      overallStats: calculateStats(overallScores),
      speakingStats: calculateStats(speakingScores),
      fluencyStats: calculateStats(fluencyScores),
      pronunciationStats: calculateStats(pronunciationScores),
      grammarStats: calculateStats(grammarScores),
      vocabularyStats: calculateStats(vocabularyScores),
      scoresByLevel
    });
  } catch (error) {
    console.error('Error fetching score analytics:', error);
    res.status(500).json({ error: 'Failed to fetch score analytics' });
  }
});

/**
 * Get test activity timeline
 * GET /api/analytics/timeline
 */
router.get('/timeline', authenticateToken, async (req, res) => {
  try {
    const adminId = req.admin?.id;
    const { days = 30 } = req.query;
    const daysToFetch = parseInt(days as string) || 30;

    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Set date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToFetch);

    // Get test creation activity
    const testsCreated = await prisma.test.findMany({
      where: {
        adminId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Get test completion activity
    const testsCompleted = await prisma.candidateTest.findMany({
      where: {
        test: {
          adminId
        },
        status: 'completed',
        completedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        completedAt: true
      },
      orderBy: {
        completedAt: 'asc'
      }
    });

    // Build a day-by-day activity timeline
    const timeline = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      
      // Count tests created on this day
      const createdCount = testsCreated.filter(test => {
        const testDate = test.createdAt.toISOString().split('T')[0];
        return testDate === dateString;
      }).length;
      
      // Count tests completed on this day
      const completedCount = testsCompleted.filter(test => {
        const testDate = test.completedAt ? test.completedAt.toISOString().split('T')[0] : '';
        return testDate === dateString;
      }).length;
      
      timeline.push({
        date: dateString,
        testsCreated: createdCount,
        testsCompleted: completedCount
      });
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      timeline,
      totalDays: daysToFetch,
      totalCreated: testsCreated.length,
      totalCompleted: testsCompleted.length
    });
  } catch (error) {
    console.error('Error fetching activity timeline:', error);
    res.status(500).json({ error: 'Failed to fetch activity timeline' });
  }
});

export default router; 