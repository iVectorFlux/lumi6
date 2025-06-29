import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to check superadmin role
function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if ((req as any).admin?.role !== 'superadmin') {
    return res.status(403).json({ error: 'Forbidden: Super admin only' });
  }
  next();
}

// GET /api/superadmin/companies
router.get('/companies', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        admins: true,
      },
    });
    const filtered = companies.filter(c => c.admins.some(a => a.role !== 'superadmin'));
    const formatted = filtered.map((c: { id: string; name: string; admins: { email: string }[]; status?: string; totalCredits?: number; availableCredits?: number; }) => ({
      id: c.id,
      name: c.name,
      admin: c.admins && c.admins.length > 0 ? c.admins[0].email : '',
      status: c.status, // 'trial' or 'paid'
      totalCredits: c.totalCredits,
      availableCredits: c.availableCredits,
    }));
    res.json({ companies: formatted });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// GET /api/superadmin/candidates/:candidateId - Get single candidate
router.get('/candidates/:candidateId', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  const { candidateId } = req.params;

  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        company: {
          select: { id: true, name: true }
        }
      }
    });
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      status: candidate.status,
      companyId: candidate.companyId,
      company: candidate.company
    });
  } catch (error) {
    console.error('Error fetching candidate:', error);
    res.status(500).json({ error: 'Failed to fetch candidate' });
  }
});

// GET /api/superadmin/candidates
router.get('/candidates', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const candidates = await prisma.candidate.findMany({
      include: {
        company: true,
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
    const formatted = candidates.map((c: { id: string; name: string; email: string; company?: { name: string }; tests?: any[] }) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      company: c.company?.name || '',
      status: c.tests && c.tests[0]?.status || '',
      cefrLevel: c.tests && c.tests[0]?.result?.cefrLevel || '',
      score: c.tests && c.tests[0]?.result?.overallScore || null,
    }));
    res.json({ candidates: formatted });
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// POST /api/superadmin/candidates - Create candidate for any company
router.post('/candidates', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  const { firstName, lastName, email, companyId, status = 'pending' } = req.body;
  
  if (!firstName || !lastName || !email || !companyId) {
    return res.status(400).json({ error: 'firstName, lastName, email, and companyId are required' });
  }

  try {
    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check for duplicate email in the same company
    const existingCandidate = await prisma.candidate.findFirst({
      where: { email, companyId }
    });
    
    if (existingCandidate) {
      return res.status(400).json({ error: 'Candidate with this email already exists in this company' });
    }

    // Generate random password
    const password = require('crypto').randomBytes(4).toString('hex');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const candidate = await prisma.candidate.create({
      data: {
        name: `${firstName} ${lastName}`,
        email,
        password: hashedPassword,
        status,
        companyId,
        createdBy: (req as any).admin?.id || null,
      }
    });

    res.status(201).json({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      status: candidate.status,
      companyId: candidate.companyId
    });
  } catch (error) {
    console.error('Error creating candidate:', error);
    res.status(500).json({ error: 'Failed to create candidate' });
  }
});

// PUT /api/superadmin/candidates/:candidateId - Update any candidate
router.put('/candidates/:candidateId', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  const { firstName, lastName, email, status, companyId } = req.body;
  const { candidateId } = req.params;

  try {
    // Check if candidate exists
    const existingCandidate = await prisma.candidate.findUnique({
      where: { id: candidateId }
    });
    
    if (!existingCandidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // If companyId is being changed, check if new company exists
    if (companyId && companyId !== existingCandidate.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: companyId }
      });
      if (!company) {
        return res.status(404).json({ error: 'New company not found' });
      }
    }

    // Check for email conflicts (if email is being changed)
    if (email && email !== existingCandidate.email) {
      const targetCompanyId = companyId || existingCandidate.companyId;
      const emailExists = await prisma.candidate.findFirst({
        where: { 
          email, 
          companyId: targetCompanyId, 
          id: { not: candidateId } 
        }
      });
      if (emailExists) {
        return res.status(400).json({ error: 'Email already exists for another candidate in this company' });
      }
    }

    const updatedCandidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        ...(firstName && lastName ? { name: `${firstName} ${lastName}` } : {}),
        ...(email ? { email } : {}),
        ...(status ? { status } : {}),
        ...(companyId ? { companyId } : {}),
      }
    });

    res.json({
      id: updatedCandidate.id,
      name: updatedCandidate.name,
      email: updatedCandidate.email,
      status: updatedCandidate.status,
      companyId: updatedCandidate.companyId
    });
  } catch (error) {
    console.error('Error updating candidate:', error);
    res.status(500).json({ error: 'Failed to update candidate' });
  }
});

// DELETE /api/superadmin/candidates/:candidateId - Delete any candidate
router.delete('/candidates/:candidateId', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  const { candidateId } = req.params;

  try {
    // Check if candidate exists
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId }
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

// GET /api/superadmin/candidates/enhanced (Enhanced candidates with all test types)
router.get('/candidates/enhanced', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    console.log('Enhanced candidates request for superadmin');
    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // Search and filter parameters
    const search = req.query.search as string || '';
    const status = req.query.status as string || 'All';
    const company = req.query.company as string || 'All Companies';
    
    // Build where clause
    const whereClause: any = {};
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }
    
    if (company !== 'All Companies') {
      whereClause.company = { name: company };
    }
    
    // Get total count for pagination
    const totalCount = await prisma.candidate.count({
      where: whereClause
    });
    
    // Get paginated candidates across all companies with their test results
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

        // Check for proficiency test results by email
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
          completedAt: eqResult.createdAt.toISOString()
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

        // Calculate overall progress (now 4 tests)
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
          company: candidate.company.name,
          companyId: candidate.companyId,
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

// GET /api/superadmin/candidates/:id/complete-profile (Enhanced profile with all test types)
router.get('/candidates/:id/complete-profile', async (req, res) => {
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

// GET /api/superadmin/assessments
router.get('/assessments', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    // Fetch all three types of assessments and companies
    const [candidateTests, proficiencyTests, eqTests, companies] = await Promise.all([
      // Speaking tests (CandidateTest)
      prisma.candidateTest.findMany({
        include: {
          test: { include: { company: true } },
          candidate: true,
          result: true,
        },
      }),
      // Proficiency tests
      prisma.proficiencyTest.findMany(),
      // EQ tests
      prisma.eQTest.findMany({
        include: {
          company: true,
          results: {
            include: {
              candidate: true,
            },
            take: 1,
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      }),
      // Companies for mapping
      prisma.company.findMany(),
    ]);

    // Create company lookup map
    const companyMap = new Map(companies.map(c => [c.id, c.name]));

    // Format speaking tests
    const formattedCandidateTests = candidateTests.map((a: any) => ({
      id: a.id,
      name: a.test?.title || 'Speaking Assessment',
      type: 'Speaking',
      company: a.test?.company?.name || '',
      candidate: a.candidate?.name || '',
      candidateEmail: a.candidate?.email || '',
      status: a.status,
      date: a.createdAt,
      score: a.result?.overallScore || null,
      cefrLevel: a.result?.cefrLevel || null,
    }));

    // Format proficiency tests
    const formattedProficiencyTests = proficiencyTests.map((p: any) => ({
      id: p.id,
      name: 'Proficiency Test',
      type: 'Proficiency',
      company: p.companyId ? companyMap.get(p.companyId) || '' : '',
      candidate: p.candidateName || '',
      candidateEmail: p.candidateEmail || '',
      status: p.status,
      date: p.createdAt,
      score: p.score || null,
      cefrLevel: p.result || null,
    }));

    // Format EQ tests
    const formattedEQTests = eqTests.map((e: any) => ({
      id: e.id,
      name: e.title || 'EQ Assessment',
      type: 'EQ',
      company: e.company?.name || '',
      candidate: e.results?.[0]?.candidate?.name || '',
      candidateEmail: e.results?.[0]?.candidate?.email || '',
      status: e.results?.[0]?.completedAt ? 'completed' : 'pending',
      date: e.createdAt,
      score: e.results?.[0]?.overallScore || null,
      cefrLevel: null, // EQ tests don't have CEFR levels
    }));

    // Combine all assessments and sort by date
    const allAssessments = [
      ...formattedCandidateTests,
      ...formattedProficiencyTests,
      ...formattedEQTests,
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ assessments: allAssessments });
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

// POST /api/superadmin/companies - Create a new company (business user)
const createCompanySchema = z.object({
  name: z.string().min(2),
  companyAdminEmail: z.string().email(),
  status: z.enum(['trial', 'paid']),
  testPermissions: z.array(z.enum(['SPEAKING', 'PROFICIENCY', 'EQ', 'WRITING'])),
  credits: z.object({
    SPEAKING: z.number().int().min(0),
    PROFICIENCY: z.number().int().min(0),
    EQ: z.number().int().min(0),
    WRITING: z.number().int().min(0)
  })
});

router.post('/companies', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { name, companyAdminEmail, status, testPermissions, credits } = createCompanySchema.parse(req.body);
    
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the company
      const company = await tx.company.create({
        data: {
          name,
        },
      });

      // 2. Create consolidated test configurations (permissions + credits)
      for (const testType of testPermissions) {
        const creditAmount = credits[testType as keyof typeof credits];
        await tx.companyTestConfig.create({
          data: {
            companyId: company.id,
            testType: testType as any,
            isEnabled: true,
            totalCredits: creditAmount,
            usedCredits: 0,
            availableCredits: creditAmount,
            isActive: true
          }
        });
      }

      // 4. Create the company admin for the company (if not exists)
      let companyAdmin = await tx.admin.findUnique({ where: { email: companyAdminEmail } });
      let generatedPassword = '';
      if (!companyAdmin) {
        // Generate a random password
        generatedPassword = require('crypto').randomBytes(4).toString('hex');
        // Hash the password
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);
        companyAdmin = await tx.admin.create({
          data: {
            email: companyAdminEmail,
            name: companyAdminEmail.split('@')[0], // Use email prefix as name
            password: hashedPassword,
            role: 'companyadmin',
            companyId: company.id,
          },
        });
      } else {
        // If company admin exists, update their companyId
        await tx.admin.update({
          where: { id: companyAdmin.id },
          data: { companyId: company.id },
        });
      }

      return { company, companyAdmin, generatedPassword };
    });

    res.status(201).json({
      message: 'Company and company admin created successfully',
      companyId: result.company.id,
      companyName: result.company.name,
      companyAdminLoginUrl: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/companyadmin/login`,
      companyAdminId: result.companyAdmin?.id,
      companyAdminEmail: companyAdminEmail,
      companyAdminPassword: result.generatedPassword || undefined,
      testPermissions,
      credits
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error creating company:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// POST /api/superadmin/tests - Create a test for a candidate in a selected company
const createTestSchema = z.object({
  employeeName: z.string().min(2),
  employeeEmail: z.string().email(),
  companyId: z.string().min(1),
});

router.post('/tests', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { employeeName, employeeEmail, companyId } = createTestSchema.parse(req.body);
    // Generate a random password for the candidate
    const candidatePassword = Math.random().toString(36).substring(2, 10);

    // Create test, candidate, and candidateTest in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the candidate
      const candidate = await tx.candidate.create({
        data: {
          name: employeeName,
          email: employeeEmail,
          password: candidatePassword,
          status: 'active',
          companyId,
        },
      });
      // 2. Create the test
      const test = await tx.test.create({
        data: {
          adminId: (req as any).user.id, // superadmin's id
          companyId,
          selectionStrategy: 'balanced',
        },
      });
      // 3. Link candidate and test via CandidateTest
      const candidateTest = await tx.candidateTest.create({
        data: {
          candidateId: candidate.id,
          testId: test.id,
          status: 'active',
        },
      });
      return { test, candidate, candidateTest };
    });

    // Generate test link (example)
    const testLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/test/${encodeURIComponent(result.candidate.id)}`;

    res.status(201).json({
      testId: result.test.id,
      candidateId: result.candidate.id,
      candidatePassword,
      testLink,
      employeeName,
      employeeEmail,
      companyId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating test:', error);
    res.status(500).json({ error: 'Error creating test' });
  }
});

// POST /api/superadmin/login - Superadmin login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin || admin.role !== 'superadmin') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name, role: admin.role, companyId: admin.companyId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// DELETE /api/superadmin/companies/:id - Delete a company and its companyadmins
router.delete('/companies/:id', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  const companyId = req.params.id;
  try {
    // Find the company and its admins
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { admins: true },
    });
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    // Prevent deleting if only superadmins are admins
    if (company.admins.every(a => a.role === 'superadmin')) {
      return res.status(400).json({ error: 'Cannot delete a company with only superadmin(s).' });
    }
    // Delete all companyadmins for this company
    await prisma.admin.deleteMany({ where: { companyId, role: 'companyadmin' } });
    // Delete the company
    await prisma.company.delete({ where: { id: companyId } });
    res.json({ message: 'Company and company admins deleted' });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

// Proficiency Questions Endpoints
router.get('/proficiency-questions', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { search, type, difficulty, language, page = '1', limit = '20' } = req.query;
    
    const where: any = {};
    if (search) {
      where.text = { contains: search as string, mode: 'insensitive' };
    }
    if (type) where.type = type;
    if (difficulty) where.difficulty = difficulty;
    if (language) where.language = language;
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);
    
    const [questions, total] = await Promise.all([
      prisma.globalProficiencyQuestion.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.globalProficiencyQuestion.count({ where })
    ]);
    
    res.json({
      questions,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching proficiency questions:', error);
    res.status(500).json({ error: 'Failed to fetch proficiency questions' });
  }
});

router.get('/proficiency-questions/stats', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const [
      totalQuestions,
      activeQuestions,
      questionsByType,
      questionsByDifficulty,
      questionsByLanguage
    ] = await Promise.all([
      prisma.globalProficiencyQuestion.count(),
      prisma.globalProficiencyQuestion.count(), // All proficiency questions are considered active
      prisma.globalProficiencyQuestion.groupBy({
        by: ['type'],
        _count: { id: true }
      }),
      prisma.globalProficiencyQuestion.groupBy({
        by: ['difficulty'],
        _count: { id: true }
      }),
      prisma.globalProficiencyQuestion.groupBy({
        by: ['language'],
        _count: { id: true }
      })
    ]);

    const stats = {
      totalQuestions,
      activeQuestions,
      byType: questionsByType.reduce((acc: Record<string, number>, stat: any) => {
        acc[stat.type] = stat._count.id;
        return acc;
      }, {} as Record<string, number>),
      byDifficulty: questionsByDifficulty.reduce((acc: Record<string, number>, stat: any) => {
        acc[stat.difficulty] = stat._count.id;
        return acc;
      }, {} as Record<string, number>),
      byLanguage: questionsByLanguage.reduce((acc: Record<string, number>, stat: any) => {
        acc[stat.language || 'en'] = stat._count.id;
        return acc;
      }, {} as Record<string, number>)
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching proficiency question stats:', error);
    res.status(500).json({ error: 'Failed to fetch proficiency question statistics' });
  }
});

router.get('/proficiency-questions/export', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const questions = await prisma.globalProficiencyQuestion.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    // Convert to CSV format
    const csvHeader = 'ID,Text,Type,Category,Difficulty,Language,Options,Correct Answer,Score,Media URL,Audio,Image,Created At\n';
    const csvRows = questions.map(q => 
      `"${q.id}","${q.text.replace(/"/g, '""')}","${q.type}","${q.category}","${q.difficulty}","${q.language || 'en'}","${Array.isArray(q.options) ? q.options.join(';') : (q.options || '')}","${q.correctAnswer || ''}","${q.score || 0}","${q.mediaUrl || ''}","${q.mediaAudio || ''}","${q.mediaImage || ''}","${q.createdAt.toISOString()}"`
    ).join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="proficiency-questions.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting proficiency questions:', error);
    res.status(500).json({ error: 'Failed to export proficiency questions' });
  }
});

router.post('/proficiency-questions', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const {
      text,
      type,
      category,
      difficulty,
      options,
      correctAnswer,
      score,
      mediaUrl,
      mediaAudio,
      mediaImage,
      language
    } = req.body;

    // Validation
    if (!text || !type || !category || !difficulty) {
      return res.status(400).json({ 
        error: 'Missing required fields: text, type, category, difficulty' 
      });
    }

    const question = await prisma.globalProficiencyQuestion.create({
      data: {
        text,
        type,
        category,
        difficulty,
        options: options || null,
        correctAnswer: correctAnswer || null,
        score: score || 100,
        mediaUrl: mediaUrl || null,
        mediaAudio: mediaAudio || null,
        mediaImage: mediaImage || null,
        language: language || 'en'
      }
    });

    res.status(201).json({ question });
  } catch (error) {
    console.error('Error creating proficiency question:', error);
    res.status(500).json({ error: 'Failed to create proficiency question' });
  }
});

router.put('/proficiency-questions/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const question = await prisma.globalProficiencyQuestion.update({
      where: { id },
      data: updateData
    });

    res.json({ question });
  } catch (error) {
    console.error('Error updating proficiency question:', error);
    res.status(500).json({ error: 'Failed to update proficiency question' });
  }
});

router.delete('/proficiency-questions/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if question is used in any tests
    const usedInTests = await prisma.proficiencyTest.findFirst({
      where: {
        // Note: This would need to be updated based on how proficiency tests link to questions
        // For now, we'll allow deletion
      }
    });

    await prisma.globalProficiencyQuestion.delete({
      where: { id }
    });

    res.json({ message: 'Proficiency question deleted successfully' });
  } catch (error) {
    console.error('Error deleting proficiency question:', error);
    res.status(500).json({ error: 'Failed to delete proficiency question' });
  }
});

router.post('/proficiency-questions/import', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: 'Invalid questions format' });
    }
    const created = await prisma.$transaction(
      questions.map((q: any) =>
        prisma.globalProficiencyQuestion.create({ 
          data: {
            text: q.text,
            type: q.type || 'mcq',
            category: q.category || 'general',
            difficulty: q.difficulty || 'medium',
            options: q.options || null,
            correctAnswer: q.correctAnswer || null,
            score: q.score || 100,
            mediaUrl: q.mediaUrl || null,
            mediaAudio: q.mediaAudio || null,
            mediaImage: q.mediaImage || null,
            language: q.language || 'en'
          }
        })
      )
    );
    res.status(201).json({ 
      message: `Imported ${created.length} questions.`,
      questions: created 
    });
  } catch (error) {
    console.error('Error importing proficiency questions:', error);
    res.status(500).json({ error: 'Failed to import proficiency questions' });
  }
});





export default router; 