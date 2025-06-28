import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { processVideoAndEvaluate } from '../services/ai';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const completeTestSchema = z.object({
  videoUrl: z.string().url()
});

// Candidate login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const candidate = await prisma.candidate.findFirst({
      where: { email }
    });

    if (!candidate || candidate.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      candidateId: candidate.id,
      name: candidate.name,
      email: candidate.email,
      testId: candidate.currentTestId
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Error logging in' });
  }
});

// Complete test and process video
router.post('/:candidateId/complete', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { videoUrl } = completeTestSchema.parse(req.body);

    // Update candidate status
    const candidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: { status: 'completed' }
    });

    // Find the candidateTest for this candidate (latest)
    const candidateTest = await prisma.candidateTest.findFirst({
      where: { candidateId },
      orderBy: { createdAt: 'desc' }
    });
    if (!candidateTest) {
      return res.status(404).json({ error: 'Candidate test not found' });
    }

    // Process video and get AI evaluation
    const evaluation = await processVideoAndEvaluate(videoUrl);

    // Create test result
    const result = await prisma.testResult.create({
      data: {
        candidateTestId: candidateTest.id,
        cefrLevel: evaluation.cefrLevel,
        overallScore: evaluation.overallScore,
        speakingScore: evaluation.speakingScore,
        fluencyScore: evaluation.fluencyScore,
        pronunciationScore: evaluation.pronunciationScore,
        grammarScore: evaluation.grammarScore,
        vocabularyScore: evaluation.vocabularyScore,
        videoUrl,
        feedback: evaluation.feedback
      }
    });

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Error completing test' });
  }
});

// Get candidate's test result
router.get('/:candidateId/result', async (req, res) => {
  try {
    const { candidateId } = req.params;

    // First, try to find the latest candidateTest for this candidate
    const candidateTest = await prisma.candidateTest.findFirst({
      where: { candidateId },
      orderBy: { createdAt: 'desc' }
    });

    if (candidateTest) {
      // Found candidateTest, try to get the result
      const result = await prisma.testResult.findUnique({
        where: { candidateTestId: candidateTest.id },
        include: {
          candidateTest: {
            include: {
              candidate: {
                select: { name: true, email: true }
              }
            }
          }
        }
      });

      if (result) {
        return res.json(result);
      }
    }

    // Fallback: Try to find assessment data by candidate email
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { name: true, email: true }
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Look for any test results by checking if candidate has completed status
    if (candidate && candidate.email) {
      // Check if we have any candidate tests with results
      const candidateWithTests = await prisma.candidate.findUnique({
        where: { id: candidateId },
        include: {
          tests: {
            include: {
              result: true
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

             // If candidate has test results, use the latest one
       if (candidateWithTests && candidateWithTests.tests && candidateWithTests.tests.length > 0) {
         const latestTest = candidateWithTests.tests[0];
         if (latestTest.result) {
           return res.json({
             ...latestTest.result,
             candidateTest: {
               id: latestTest.id,
               candidate: {
                 name: candidate.name,
                 email: candidate.email
               }
             }
           });
         }
       }
    }

    return res.status(404).json({ error: 'No test results found for this candidate' });
  } catch (error) {
    console.error('Error fetching candidate result:', error);
    res.status(500).json({ error: 'Error fetching result' });
  }
});

// Get detailed analysis of candidate's performance
router.get('/:candidateId/analysis', async (req, res) => {
  try {
    const { candidateId } = req.params;

    // Find the latest candidateTest for this candidate
    const candidateTest = await prisma.candidateTest.findFirst({
      where: { candidateId },
      orderBy: { createdAt: 'desc' }
    });
    if (!candidateTest) {
      return res.status(404).json({ error: 'Candidate test not found' });
    }

    const result = await prisma.testResult.findUnique({
      where: { candidateTestId: candidateTest.id },
      include: {
        candidateTest: {
          include: {
            candidate: {
              select: {
                name: true,
                email: true
              }
            },
            test: {
              include: {
                admin: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    // Get detailed analysis from AI service
    if (result.videoUrl) {
      const detailedAnalysis = await processVideoAndEvaluate(result.videoUrl);
      res.json({
        ...result,
        detailedAnalysis: detailedAnalysis.detailedAnalysis,
        confidenceScore: detailedAnalysis.confidenceScore
      });
    } else {
      res.json(result);
    }
  } catch (error) {
    res.status(500).json({ error: 'Error fetching detailed analysis' });
  }
});

// Get candidate's progress over time (if multiple tests)
router.get('/:candidateId/progress', async (req, res) => {
  try {
    const { candidateId } = req.params;

    // Find all candidateTests for this candidate
    const candidateTests = await prisma.candidateTest.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'asc' }
    });
    const candidateTestIds = candidateTests.map(ct => ct.id);

    const results = await prisma.testResult.findMany({
      where: { candidateTestId: { in: candidateTestIds } },
      orderBy: { timestamp: 'asc' }
    });

    if (results.length === 0) {
      return res.status(404).json({ error: 'No results found' });
    }

    const progress = results.map(result => ({
      timestamp: result.timestamp,
      overallScore: result.overallScore,
      cefrLevel: result.cefrLevel,
      speakingScore: result.speakingScore,
      fluencyScore: result.fluencyScore,
      pronunciationScore: result.pronunciationScore,
      grammarScore: result.grammarScore,
      vocabularyScore: result.vocabularyScore
    }));

    // Fetch candidate info
    const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });

    res.json({
      fullName: candidate?.name || '',
      email: candidate?.email || '',
      results: progress
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching progress' });
  }
});

// Get specific aspect analysis (grammar, vocabulary, or pronunciation)
router.get('/:candidateId/analysis/:aspect', async (req, res) => {
  try {
    const { candidateId, aspect } = req.params;
    const validAspects = ['grammar', 'vocabulary', 'pronunciation'];

    if (!validAspects.includes(aspect)) {
      return res.status(400).json({ error: 'Invalid aspect specified' });
    }

    // Find the latest candidateTest for this candidate
    const candidateTest = await prisma.candidateTest.findFirst({
      where: { candidateId },
      orderBy: { createdAt: 'desc' }
    });
    if (!candidateTest) {
      return res.status(404).json({ error: 'Candidate test not found' });
    }

    const result = await prisma.testResult.findUnique({
      where: { candidateTestId: candidateTest.id }
    });

    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    if (result.videoUrl) {
      const detailedAnalysis = await processVideoAndEvaluate(result.videoUrl);
      
      const aspectAnalysis = {
        grammar: detailedAnalysis.detailedAnalysis.grammarErrors,
        vocabulary: detailedAnalysis.detailedAnalysis.vocabularyUsage,
        pronunciation: detailedAnalysis.detailedAnalysis.pronunciationIssues
      }[aspect];

      res.json({
        aspect,
        analysis: aspectAnalysis,
        score: {
          grammar: result.grammarScore,
          vocabulary: result.vocabularyScore,
          pronunciation: result.pronunciationScore
        }[aspect]
      });
    } else {
      res.status(404).json({ error: 'Result video URL not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error fetching aspect analysis' });
  }
});

// GET /api/candidates - List all candidates for the admin
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (!req.admin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const adminId = req.admin.id;
    // Find all candidates who have taken tests created by this admin
    const candidates = await prisma.candidate.findMany({
      where: {
        tests: {
          some: {
            test: {
              adminId,
            },
          },
        },
      },
      include: {
        tests: {
          include: {
            result: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1, // Only latest test
        },
      },
    });
    const formatted = candidates.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      status: c.status,
      result: c.tests[0]?.result
        ? {
            cefrLevel: c.tests[0].result.cefrLevel,
            overallScore: c.tests[0].result.overallScore,
            timestamp: c.tests[0].createdAt ? c.tests[0].createdAt : null,
          }
        : null,
    }));
    res.json({ candidates: formatted });
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// Get candidate by email
router.get('/by-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const candidate = await prisma.candidate.findFirst({
      where: { email },
      include: { 
        tests: {
          include: { result: true }
        }
      }
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json(candidate);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching candidate' });
  }
});

// GET /api/candidates/:id/complete-profile (Enhanced profile with all test types)
router.get('/:id/complete-profile', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get candidate with all test relationships
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        company: true,
        tests: {
          include: {
            result: true,
            test: true
          }
        },
        eqResults: true
      }
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Process speaking test results
    const speakingTest = candidate.tests.find(t => t.result);
    const speakingTestResult = speakingTest?.result ? {
      id: speakingTest.id,
      type: 'speaking' as const,
      status: speakingTest.status as 'completed' | 'pending' | 'not_taken',
      score: speakingTest.result.overallScore,
      level: speakingTest.result.cefrLevel,
      completedAt: speakingTest.result.timestamp.toISOString(),
      details: speakingTest.result
    } : {
      id: speakingTest?.id || '',
      type: 'speaking' as const,
      status: (speakingTest?.status || 'not_taken') as 'completed' | 'pending' | 'not_taken'
    };

    // Check for proficiency test results by email
    const proficiencyResult = await prisma.proficiencyTest.findFirst({
      where: { 
        candidateId: candidate.id,
        status: 'completed'
      }
    });
    
    const proficiencyTestResult = proficiencyResult ? {
      id: proficiencyResult.id,
      type: 'proficiency' as const,
      status: 'completed' as const,
      score: proficiencyResult.score,
      level: proficiencyResult.result,
      completedAt: proficiencyResult.updatedAt.toISOString(),
      details: proficiencyResult
    } : {
      id: '',
      type: 'proficiency' as const,
      status: 'not_taken' as const
    };

    // Process EQ test results
    const eqResult = candidate.eqResults[0];
    const eqTestResult = eqResult ? {
      id: eqResult.id,
      type: 'eq' as const,
      status: 'completed' as const,
      score: Math.round(eqResult.overallScore),
      level: eqResult.eqRating,
      completedAt: eqResult.createdAt.toISOString(),
      details: eqResult
    } : {
      id: '',
      type: 'eq' as const,
      status: 'not_taken' as const
    };

    // NEW: Process Writing test results
    const writingTest = await prisma.writingTest.findFirst({
      where: {
        candidateId: candidate.id,
        companyId: candidate.companyId,
      },
      include: { result: true },
      orderBy: { createdAt: 'desc' }
    });

    const writingTestResult = writingTest?.result ? {
      id: writingTest.id,
      type: 'writing' as const,
      status: 'completed' as const,
      score: writingTest.result.overallScore,
      level: writingTest.result.cefrLevel,
      completedAt: writingTest.result.createdAt.toISOString()
    } : writingTest ? {
      id: writingTest.id,
      type: 'writing' as const,
      status: 'pending' as const
    } : {
      id: '',
      type: 'writing' as const,
      status: 'not_taken' as const
    };

    // Calculate overall progress
    const testResults = [speakingTestResult, proficiencyTestResult, eqTestResult, writingTestResult];
    const completedTests = testResults.filter(t => t.status === 'completed').length;
    const totalTests = 4;
    
    let overallStatus = 'Not Started';
    if (completedTests === totalTests) {
      overallStatus = 'Completed';
    } else if (completedTests > 0) {
      overallStatus = 'In Progress';
    }

    const enhancedProfile = {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      company: candidate.company.name,
      companyId: candidate.companyId,
      overallStatus,
      testsCompleted: completedTests,
      totalTests,
      speakingTest: speakingTestResult,
      proficiencyTest: proficiencyTestResult,
      eqTest: eqTestResult,
      writingTest: writingTestResult,
      createdAt: candidate.createdAt.toISOString()
    };

    res.json(enhancedProfile);
  } catch (error) {
    console.error('Error fetching enhanced candidate profile:', error);
    res.status(500).json({ error: 'Failed to fetch candidate profile' });
  }
});

// Get enhanced single candidate data with all test results (standalone route)
router.get('/:candidateId/enhanced', async (req, res) => {
  const { candidateId } = req.params;
  
  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        tests: {
          include: { result: true },
          orderBy: { createdAt: 'desc' }
        },
        proficiencyTests: {
          orderBy: { createdAt: 'desc' }
        },
        eqResults: {
          orderBy: { createdAt: 'desc' }
        },
        writingTests: {
          include: { result: true },
          orderBy: { createdAt: 'desc' }
        },
        createdByAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Process ALL Speaking test results (from CandidateTest)
    const speakingTests = candidate.tests.map(test => ({
      id: test.id,
      status: test.result ? 'completed' as const : 'pending' as const,
      score: test.result?.overallScore || null,
      level: test.result?.cefrLevel || null,
      completedAt: test.result?.timestamp?.toISOString() || test.createdAt.toISOString(),
      createdAt: test.createdAt.toISOString(),
      fluencyScore: test.result?.fluencyScore || null,
      pronunciationScore: test.result?.pronunciationScore || null,
      grammarScore: test.result?.grammarScore || null,
      vocabularyScore: test.result?.vocabularyScore || null
    }));

    // Process ALL Proficiency test results
    const proficiencyTests = candidate.proficiencyTests.map(test => ({
      id: test.id,
      status: 'completed' as const,
      score: test.score,
      level: test.result,
      completedAt: (test.completedAt || test.updatedAt).toISOString(),
      createdAt: test.createdAt.toISOString()
    }));

    // Process ALL EQ test results
    const eqTests = candidate.eqResults.map(result => ({
      id: result.id,
      status: 'completed' as const,
      score: Math.round(result.overallScore),
      level: result.eqRating,
      completedAt: result.createdAt.toISOString(),
      createdAt: result.createdAt.toISOString(),
      // Add detailed EQ scores from JSON fields
      moduleScores: result.moduleScores,
      submoduleScores: result.submoduleScores,
      inconsistencyIndex: result.inconsistencyIndex,
      inconsistencyRating: result.inconsistencyRating
    }));

    // Process ALL Writing test results
    const writingTests = candidate.writingTests.map(test => ({
      id: test.id,
      status: test.result ? 'completed' as const : 'pending' as const,
      score: test.result?.overallScore || null,
      level: test.result?.cefrLevel || null,
      completedAt: test.result?.createdAt?.toISOString() || test.createdAt.toISOString(),
      createdAt: test.createdAt.toISOString()
    }));

    // Calculate overall progress and metrics
    const allTests = [...speakingTests, ...proficiencyTests, ...eqTests, ...writingTests];
    const completedTests = allTests.filter(test => test.status === 'completed');
    const totalTests = allTests.length;
    const progressPercentage = totalTests > 0 ? Math.round((completedTests.length / totalTests) * 100) : 0;

    const enhancedCandidate = {
      id: candidate.id,
      firstName: candidate.name.split(' ')[0] || candidate.name,
      lastName: candidate.name.split(' ').slice(1).join(' ') || '',
      email: candidate.email,
      status: candidate.status,
      createdAt: candidate.createdAt.toISOString(),
      companyId: candidate.companyId,
      
      // Test results with full history
      speakingTests: speakingTests,
      proficiencyTests: proficiencyTests,
      eqTests: eqTests,
      writingTests: writingTests,
      
      // Summary data
      totalTestsCompleted: completedTests.length,
      totalTestsAssigned: totalTests,
      progressPercentage: progressPercentage,
      
      // Latest results for quick access
      latestSpeaking: speakingTests.length > 0 ? speakingTests[0] : null,
      latestProficiency: proficiencyTests.length > 0 ? proficiencyTests[0] : null,
      latestEQ: eqTests.length > 0 ? eqTests[0] : null,
      latestWriting: writingTests.length > 0 ? writingTests[0] : null,
      
      createdBy: candidate.createdByAdmin
    };

    res.json(enhancedCandidate);
  } catch (error) {
    console.error('Error fetching enhanced candidate:', error);
    res.status(500).json({ error: 'Failed to fetch candidate data' });
  }
});

export default router; 