import express from 'express';
import { PrismaClient, $Enums } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticateToken } from '../middleware/auth';
import { creditService } from '../services/creditService';
const router = express.Router();
const prisma = new PrismaClient();

// Create a company
router.post('/', (req, res) => {
  // TODO: Implement company creation logic
  res.json({ message: 'Company created (stub)' });
});

// List companies
router.get('/', (req, res) => {
  // TODO: Implement list companies logic
  res.json({ companies: [] });
});

// List candidates for a company
router.get('/:companyId/candidates', authenticateToken, async (req, res) => {
  const { companyId } = req.params;
  if (req.admin?.companyId !== companyId) {
    return res.status(403).json({ error: 'Unauthorized: You can only access your own company' });
  }
  try {
    const candidates = await prisma.candidate.findMany({
      where: { companyId },
      include: {
        tests: {
          include: {
            result: true
          }
        }
      }
    });
    // Map to frontend shape
    const mapped = candidates.map(c => {
      const testsTaken = c.tests.length;
      const latestTest = c.tests.length > 0 ? c.tests[c.tests.length - 1] : null;
      let latestResult = '-';
      if (latestTest && latestTest.result) {
        latestResult = `${latestTest.result.cefrLevel} (${latestTest.result.overallScore})`;
      }
      // Split name into first/last for UI
      const [firstName, ...rest] = c.name.split(' ');
      const lastName = rest.join(' ');
      return {
        id: c.id,
        firstName,
        lastName,
        email: c.email,
        status: c.status,
        testsTaken,
        latestResult
      };
    });
    res.json({ candidates: mapped });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// Add a candidate to a company (single only)
router.post('/:companyId/candidates', authenticateToken, async (req, res) => {
  const { firstName, lastName, email } = req.body;
  const { companyId } = req.params;
  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'firstName, lastName, and email are required' });
  }
  // Only allow company admins of this company
  if (req.admin?.companyId !== companyId) {
    return res.status(403).json({ error: 'Unauthorized: You can only add candidates to your own company' });
  }
  try {
    // Check for duplicate
    let candidate = await prisma.candidate.findFirst({ where: { email, companyId } });
    if (candidate) {
      // Return the existing candidate
      return res.status(200).json({
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        status: candidate.status
      });
    }
    // Generate random password
          const password = require('crypto').randomBytes(4).toString('hex');
    const hashedPassword = await bcrypt.hash(password, 10);
    candidate = await prisma.candidate.create({
      data: {
        name: `${firstName} ${lastName}`,
        email,
        password: hashedPassword,
        status: 'active',
        companyId,
        createdBy: (req as any).admin?.id || null,
      }
    });
    res.status(201).json({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      status: candidate.status
      // Do not return password
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create candidate' });
  }
});

// Update a candidate in a company
router.put('/:companyId/candidates/:candidateId', authenticateToken, async (req, res) => {
  const { firstName, lastName, email, status } = req.body;
  const { companyId, candidateId } = req.params;
  
  // Only allow company admins of this company
  if (req.admin?.companyId !== companyId) {
    return res.status(403).json({ error: 'Unauthorized: You can only update candidates in your own company' });
  }

  try {
    // Check if candidate exists and belongs to this company
    const existingCandidate = await prisma.candidate.findFirst({
      where: { id: candidateId, companyId }
    });
    
    if (!existingCandidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Check for email conflicts (if email is being changed)
    if (email && email !== existingCandidate.email) {
      const emailExists = await prisma.candidate.findFirst({
        where: { email, companyId, id: { not: candidateId } }
      });
      if (emailExists) {
        return res.status(400).json({ error: 'Email already exists for another candidate' });
      }
    }

    const updatedCandidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        ...(firstName && lastName ? { name: `${firstName} ${lastName}` } : {}),
        ...(email ? { email } : {}),
        ...(status ? { status } : {}),
      }
    });

    res.json({
      id: updatedCandidate.id,
      name: updatedCandidate.name,
      email: updatedCandidate.email,
      status: updatedCandidate.status
    });
  } catch (error) {
    console.error('Error updating candidate:', error);
    res.status(500).json({ error: 'Failed to update candidate' });
  }
});

// Delete a candidate from a company
router.delete('/:companyId/candidates/:candidateId', authenticateToken, async (req, res) => {
  const { companyId, candidateId } = req.params;
  
  // Only allow company admins of this company
  if (req.admin?.companyId !== companyId) {
    return res.status(403).json({ error: 'Unauthorized: You can only delete candidates from your own company' });
  }

  try {
    // Check if candidate exists and belongs to this company
    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, companyId }
    });
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Delete related records first (cascade)
    await prisma.candidateTest.deleteMany({
      where: { candidateId }
    });

    // Delete the candidate
    await prisma.candidate.delete({
      where: { id: candidateId }
    });

    res.json({ message: 'Candidate deleted successfully' });
  } catch (error) {
    console.error('Error deleting candidate:', error);
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
});

// Get company analytics - success rate
router.get('/:companyId/analytics/success-rate', authenticateToken, async (req, res) => {
  const { companyId } = req.params;
  
  // Only allow company admins of this company
  if (req.admin?.companyId !== companyId) {
    return res.status(403).json({ error: 'Unauthorized: You can only access your own company analytics' });
  }

  try {
    // Simple approach: count all tests and completed tests for this company
    const totalTests = await prisma.candidateTest.count({
      where: {
        test: { companyId }
      }
    });

    const completedTests = await prisma.candidateTest.count({
      where: {
        test: { companyId },
        completedAt: { not: null }
      }
    });
    
    // Calculate success rate
    let successRate = 0;
    if (totalTests > 0) {
      successRate = Math.round((completedTests / totalTests) * 100);
    }

    res.json({ 
      successRate,
      totalTests,
      completedTests
    });
  } catch (error) {
    console.error('Error calculating success rate:', error);
    res.status(500).json({ error: 'Failed to calculate success rate' });
  }
});

// Remove bulk import endpoint (no longer supported)
// router.post('/:companyId/candidates/import', ... )

// List tests for a company
router.get('/:companyId/tests', (req, res) => {
  // TODO: Implement list tests for company logic
  res.json({ tests: [] });
});

// Create a test for a company (single only)
router.post('/:companyId/tests', authenticateToken, async (req, res) => {
  try {
    const { name, email, testType = 'SPEAKING' } = req.body;
    const { companyId } = req.params;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }
    if (!req.admin?.id) {
      return res.status(401).json({ error: 'Unauthorized: admin id missing' });
    }

    // Validate test type
    const validTestTypes = ['SPEAKING', 'PROFICIENCY', 'EQ', 'WRITING'];
    if (!validTestTypes.includes(testType)) {
      return res.status(400).json({ error: 'Invalid test type' });
    }

    // Check company exists
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check permissions and credits using new credit system
    const hasPermission = await creditService.hasTestPermission(companyId, testType);
    if (!hasPermission) {
      return res.status(403).json({ 
        error: `Company does not have permission for ${testType} tests. Please contact support.` 
      });
    }

    const availableCredits = await creditService.getCreditBalance(companyId, testType);
    if (availableCredits <= 0) {
      return res.status(403).json({ 
        error: `No available credits for ${testType} tests. Please purchase more credits.` 
      });
    }

    // Check for existing candidate
    let candidate = await prisma.candidate.findFirst({ where: { email, companyId } });
    let password;
    if (!candidate) {
      // Generate password for candidate
      password = require('crypto').randomBytes(4).toString('hex');
      const hashedPassword = await bcrypt.hash(password, 10);
      candidate = await prisma.candidate.create({
        data: {
          name,
          email,
          password: hashedPassword,
          companyId,
          createdBy: (req as any).admin?.id || null,
        },
      });
    }

    // Create test
    const test = await prisma.test.create({
      data: {
        adminId: req.admin.id,
        companyId,
        selectionStrategy: 'balanced',
        title: 'CEFR Speaking Test',
      },
    });

    // Link candidate and test
    const candidateTest = await prisma.candidateTest.create({
      data: {
        candidateId: candidate.id,
        testId: test.id,
      },
    });

    // Generate test link
    const testLink = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/test/${candidate.id}`;
    
    // Send email (mock/log for now)
    console.log(`Send email to ${email} with test link: ${testLink}, login: ${email}, password: ${password || '[existing]'}`);
    
    res.json({
      testLink,
      login: email,
      password: password || '[existing]',
      candidateId: candidate.id,
      candidateName: name,
      testType,
      creditsRemaining: availableCredits,
      message: 'Test created and credentials generated.'
    });
  } catch (error) {
    console.error('Error creating test:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ 
      error: 'Failed to create test',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// List tests for a candidate
router.get('/candidates/:candidateId/tests', (req, res) => {
  // TODO: Implement list tests for candidate logic
  res.json({ tests: [] });
});

// Assign a test to a candidate (single only)
router.post('/candidates/:candidateId/tests', (req, res) => {
  const { testDetails } = req.body;
  if (!testDetails) {
    return res.status(400).json({ error: 'testDetails are required' });
  }
  // TODO: Implement single test assignment logic
  res.json({ message: 'Test assigned (stub)', testDetails });
});

// Get company info by ID
router.get('/:companyId', authenticateToken, async (req, res) => {
  const { companyId } = req.params;
  // Fetching company details
  console.log('Requested companyId:', companyId);
  console.log('Token companyId:', req.admin?.companyId);
  // Only allow company admins of this company
  if (req.admin?.companyId !== companyId) {
    console.log('403: Unauthorized');
    return res.status(403).json({ error: 'Unauthorized: You can only access your own company' });
  }
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });
    console.log('Company found:', company);
    if (!company) {
      console.log('404: Company not found');
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ error: 'Failed to fetch company info' });
  }
});

// GET /api/companies/:id/candidates/enhanced (Enhanced candidates with all test types)
router.get('/:id/candidates/enhanced', authenticateToken, async (req, res) => {
  try {
    const { id: companyId } = req.params;
    console.log('Enhanced candidates request for company:', companyId);
    console.log('Requesting admin company:', req.admin?.companyId);
    
    // Only allow company admins of this company
    if (req.admin?.companyId !== companyId) {
      console.log('403: Unauthorized access attempt');
      return res.status(403).json({ error: 'Unauthorized: You can only access your own company candidates' });
    }
    
    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // Search and filter parameters
    const search = req.query.search as string || '';
    const status = req.query.status as string || 'All';
    
    // Build where clause
    const whereClause: any = { companyId };
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Get total count for pagination
    const totalCount = await prisma.candidate.count({
      where: whereClause
    });
    
    // Get paginated candidates for the company with their test results
    const candidates = await prisma.candidate.findMany({
      where: whereClause,
      include: {
        company: true,
        createdByAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        tests: {
          include: {
            result: true,
            test: true
          }
        },
        eqResults: true
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    });

    // Process each candidate to get enhanced data
    const enhancedCandidates = await Promise.all(
      candidates.map(async (candidate) => {
        // Process speaking test results
        const speakingTest = candidate.tests.find(t => t.result);
        const speakingTestResult = speakingTest?.result ? {
          status: 'completed' as const,
          score: speakingTest.result.overallScore,
          level: speakingTest.result.cefrLevel,
          completedAt: speakingTest.result.timestamp.toISOString()
        } : {
          status: (speakingTest?.status || 'not_taken') as 'completed' | 'pending' | 'not_taken'
        };

        // Check for proficiency test results by candidate ID
        const proficiencyResult = await prisma.proficiencyTest.findFirst({
          where: { 
            candidateId: candidate.id,
            status: 'completed'
          }
        });
        
        const proficiencyTestResult = proficiencyResult ? {
          status: 'completed' as const,
          score: proficiencyResult.score,
          level: proficiencyResult.result,
          completedAt: (proficiencyResult.completedAt || proficiencyResult.updatedAt).toISOString()
        } : {
          status: 'not_taken' as const
        };

        // Process EQ test results
        const eqResult = candidate.eqResults[0];
        const eqTestResult = eqResult ? {
          status: 'completed' as const,
          score: Math.round(eqResult.overallScore),
          level: eqResult.eqRating,
          completedAt: eqResult.createdAt.toISOString(),
          createdAt: eqResult.createdAt.toISOString(),
          // Add detailed EQ scores from JSON fields
          moduleScores: eqResult.moduleScores,
          submoduleScores: eqResult.submoduleScores,
          inconsistencyIndex: eqResult.inconsistencyIndex,
          inconsistencyRating: eqResult.inconsistencyRating
        } : {
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
          status: 'completed' as const,
          score: writingTest.result.overallScore,
          level: writingTest.result.cefrLevel,
          completedAt: writingTest.result.createdAt.toISOString()
        } : writingTest ? {
          status: 'pending' as const
        } : {
          status: 'not_taken' as const
        };

        // Calculate overall progress (updated to 4 tests)
        const testResults = [speakingTestResult, proficiencyTestResult, eqTestResult, writingTestResult];
        const completedTests = testResults.filter(t => t.status === 'completed').length;
        const totalTests = 4;
        
        let overallStatus = 'Not Started';
        if (completedTests === totalTests) {
          overallStatus = 'Completed';
        } else if (completedTests > 0) {
          overallStatus = 'In Progress';
        }

        return {
          id: candidate.id,
          firstName: candidate.name.split(' ')[0] || candidate.name,
          lastName: candidate.name.split(' ').slice(1).join(' ') || '',
          email: candidate.email,
          status: candidate.status,
          overallProgress: `${completedTests}/${totalTests} Complete`,
          speakingTest: speakingTestResult,
          proficiencyTest: proficiencyTestResult,
          eqTest: eqTestResult,
          writingTest: writingTestResult,
          createdBy: candidate.createdByAdmin ? {
            id: candidate.createdByAdmin.id,
            name: candidate.createdByAdmin.name,
            email: candidate.createdByAdmin.email,
            role: candidate.createdByAdmin.role
          } : null,
          createdAt: candidate.createdAt.toISOString()
        };
      })
    );

    // Filter by status if specified (client-side for now, can be optimized)
    let filteredCandidates = enhancedCandidates;
    if (status !== 'All') {
      filteredCandidates = enhancedCandidates.filter(c => {
        if (status === 'Completed') return c.overallProgress.includes('4/4');
        if (status === 'In Progress') return c.overallProgress.match(/1\/4|2\/4|3\/4/);
        if (status === 'Not Started') return c.overallProgress.includes('0/4');
        return true;
      });
    }

    const totalPages = Math.ceil(totalCount / limit);
    
    res.json({ 
      candidates: filteredCandidates,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching enhanced candidates:', error);
    res.status(500).json({ error: 'Failed to fetch enhanced candidates' });
  }
});

// Get a single candidate for a company (must be after enhanced route)
router.get('/:companyId/candidates/:candidateId', authenticateToken, async (req, res) => {
  const { companyId, candidateId } = req.params;
  
  // Only allow company admins of this company
  if (req.admin?.companyId !== companyId) {
    return res.status(403).json({ error: 'Unauthorized: You can only access candidates from your own company' });
  }

  try {
    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, companyId }
    });
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      status: candidate.status,
      companyId: candidate.companyId
    });
  } catch (error) {
    console.error('Error fetching candidate:', error);
    res.status(500).json({ error: 'Failed to fetch candidate' });
  }
});

// Get enhanced single candidate data with all test results
router.get('/:companyId/candidates/:candidateId/enhanced', authenticateToken, async (req, res) => {
  const { companyId, candidateId } = req.params;
  
  // Only allow company admins of this company
  if (req.admin?.companyId !== companyId) {
    return res.status(403).json({ error: 'Unauthorized: You can only access candidates from your own company' });
  }

  try {
    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, companyId },
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

// Get company statistics
router.get('/:companyId/stats', authenticateToken, async (req, res) => {
  const { companyId } = req.params;
  
  // Only allow company admins of this company
  if (req.admin?.companyId !== companyId) {
    return res.status(403).json({ error: 'Unauthorized: You can only access your own company statistics' });
  }

  try {
    // Get total candidates for this company
    const totalCandidates = await prisma.candidate.count({
      where: { companyId }
    });

    // Get active tests created by admins of this company
    const activeTests = await prisma.test.count({
      where: {
        companyId,
        status: 'active'
      }
    });

    // Get completed tests count
    const completedTests = await prisma.candidateTest.count({
      where: {
        candidate: { companyId },
        status: 'completed'
      }
    });

    // Get total tests attempted
    const totalTestsAttempted = await prisma.candidateTest.count({
      where: {
        candidate: { companyId }
      }
    });

    // Calculate completion rate
    const completionRate = totalTestsAttempted > 0 
      ? Math.round((completedTests / totalTestsAttempted) * 100) 
      : 0;

    // Get company credit balances (sum of available across all test types)
    const creditBalances = await creditService.getCompanyCredits(companyId);
    const totalAvailableCredits = creditBalances.reduce((sum, cb) => sum + cb.availableCredits, 0);

    res.json({
      totalCandidates,
      activeTests,
      completedTests,
      completionRate,
      availableCredits: totalAvailableCredits,
      creditBreakdown: creditBalances
    });
  } catch (error) {
    console.error('Error fetching company statistics:', error);
    res.status(500).json({ error: 'Failed to fetch company statistics' });
  }
});

// ADD EQ TESTS ROUTES FOR COMPANY
router.post('/:companyId/eq-tests', authenticateToken, async (req, res) => {
  const { companyId } = req.params;
  let { candidateName, candidateEmail, email } = req.body;

  // Allow frontend alias `email`
  if (!candidateEmail && email) candidateEmail = email;

  if (req.admin?.companyId !== companyId) {
    return res.status(403).json({ error: 'Unauthorized: You can only create tests for your own company' });
  }
  if (!candidateName || !candidateEmail) {
    return res.status(400).json({ error: 'Missing candidateName or candidateEmail' });
  }
  try {
    // Permission & credit check (must have at least 1 available EQ credit)
    const hasPermission = await creditService.hasTestPermission(companyId, 'EQ');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Company not authorized for EQ tests' });
    }
    const availableCredits = await creditService.getCreditBalance(companyId, 'EQ');
    if (availableCredits <= 0) {
      return res.status(403).json({ error: 'No available EQ credits. Please purchase more.' });
    }

    // Find or create candidate
    let candidate = await prisma.candidate.findFirst({
      where: { email: candidateEmail, companyId }
    });
    let passwordPlain: string | undefined;
    if (!candidate) {
      passwordPlain = Math.random().toString(36).slice(-8);
      const hashedPw = await bcrypt.hash(passwordPlain, 10);
      candidate = await prisma.candidate.create({
        data: {
          name: candidateName,
          email: candidateEmail,
          password: hashedPw,
          companyId,
          status: 'active',
          createdBy: req.admin?.id || null
        }
      });
    }

    // Create EQ test
    const test = await prisma.eQTest.create({
      data: {
        title: `EQ Assessment for ${candidateName}`,
        description: 'Comprehensive Emotional Intelligence Assessment',
        companyId
      }
    });

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const testLink = `${baseUrl}/eq-test/${test.id}?candidate=${candidate.id}`;

    return res.status(201).json({
      candidateId: candidate.id,
      candidateName,
      testId: test.id,
      testLink,
      login: candidateEmail,
      password: passwordPlain || '[existing]',
      creditsRemaining: availableCredits,
      message: 'EQ test created successfully'
    });
  } catch (error) {
    console.error('Error creating EQ test (company route):', error);
    res.status(500).json({ error: 'Failed to create EQ test' });
  }
});

// ---------------------------------------------------------------------------
// PROFICIENCY TEST CREATION (company admin)
// ---------------------------------------------------------------------------
router.post('/:companyId/proficiency-tests', authenticateToken, async (req, res) => {
  const { companyId } = req.params;
  const { candidateName, candidateEmail } = req.body;

  if (req.admin?.companyId !== companyId) {
    return res.status(403).json({ error: 'Unauthorized: You can only create tests for your own company' });
  }
  if (!candidateName || !candidateEmail) {
    return res.status(400).json({ error: 'Missing candidateName or candidateEmail' });
  }
  try {
    // Check permission & credits
    const hasPermission = await creditService.hasTestPermission(companyId, 'PROFICIENCY');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Company not authorized for Proficiency tests' });
    }
    const availableCredits = await creditService.getCreditBalance(companyId, 'PROFICIENCY');
    if (availableCredits <= 0) {
      return res.status(403).json({ error: 'No available Proficiency test credits. Please purchase more.' });
    }

    // Find or create candidate
    let candidate = await prisma.candidate.findFirst({ where: { email: candidateEmail, companyId } });
    let passwordPlain: string | undefined;
    if (!candidate) {
      passwordPlain = Math.random().toString(36).slice(-8);
      const hashedPw = await bcrypt.hash(passwordPlain, 10);
      candidate = await prisma.candidate.create({
        data: {
          name: candidateName,
          email: candidateEmail,
          password: hashedPw,
          companyId,
          status: 'active',
          createdBy: req.admin?.id || null
        }
      });
    }

    // Create proficiency test
    const testPasswordPlain = Math.random().toString(36).slice(-8);
    const hashedTestPw = await bcrypt.hash(testPasswordPlain, 10);

    const proficiencyTest = await prisma.proficiencyTest.create({
      data: {
        candidateId: candidate.id,
        companyId,
        status: 'active',
        password: hashedTestPw
      }
    });

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const testLink = `${baseUrl}/proficiency-test/${proficiencyTest.id}`;

    return res.status(201).json({
      candidateId: candidate.id,
      candidateName,
      testId: proficiencyTest.id,
      testLink,
      login: candidateEmail,
      password: passwordPlain || '[existing]',
      creditsRemaining: availableCredits,
      message: 'Proficiency test created successfully'
    });
  } catch (error) {
    console.error('Error creating Proficiency test (company route):', error);
    res.status(500).json({ error: 'Failed to create Proficiency test' });
  }
});

export default router; 