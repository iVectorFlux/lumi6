import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { creditService } from '../services/creditService';
import { TestType, CreditTransactionType } from '@prisma/client';

const router = express.Router();

// ============================================================================
// COMPANY CREDIT ROUTES (For Company Admins)
// ============================================================================

/**
 * GET /api/credits/balance/:companyId - Get company credit balances
 */
router.get('/balance/:companyId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    
    // TODO: Add authorization check - ensure user can access this company's data
    
    const credits = await creditService.getCompanyCredits(companyId);
    res.json({ credits });
  } catch (error) {
    console.error('Error fetching credit balances:', error);
    res.status(500).json({ error: 'Failed to fetch credit balances' });
  }
});

/**
 * GET /api/credits/balance/:companyId/:testType - Get specific test type balance
 */
router.get('/balance/:companyId/:testType', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId, testType } = req.params;
    
    if (!Object.values(TestType).includes(testType as TestType)) {
      return res.status(400).json({ error: 'Invalid test type' });
    }
    
    const balance = await creditService.getCreditBalance(companyId, testType as TestType);
    res.json({ 
      companyId,
      testType,
      availableCredits: balance 
    });
  } catch (error) {
    console.error('Error fetching credit balance:', error);
    res.status(500).json({ error: 'Failed to fetch credit balance' });
  }
});

/**
 * GET /api/credits/permissions/:companyId - Get company test permissions
 */
router.get('/permissions/:companyId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    
    const permissions = await creditService.getCompanyPermissions(companyId);
    res.json({ 
      companyId,
      permissions 
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

/**
 * GET /api/credits/transactions/:companyId - Get company transaction history
 */
router.get('/transactions/:companyId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { testType, transactionType, startDate, endDate, limit, offset } = req.query;
    
    const filters: any = {};
    if (testType) filters.testType = testType as TestType;
    if (transactionType) filters.transactionType = transactionType as CreditTransactionType;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (limit) filters.limit = parseInt(limit as string);
    if (offset) filters.offset = parseInt(offset as string);
    
    const transactions = await creditService.getCreditTransactions(companyId, filters);
    res.json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * GET /api/credits/analytics/:companyId - Get credit usage analytics
 */
router.get('/analytics/:companyId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { days } = req.query;
    
    const analytics = await creditService.getCreditAnalytics(
      companyId, 
      days ? parseInt(days as string) : 30
    );
    
    res.json({ 
      companyId,
      analytics,
      period: `${days || 30} days`
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * POST /api/credits/validate - Validate test creation
 */
router.post('/validate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId, testType } = req.body;
    
    if (!companyId || !testType) {
      return res.status(400).json({ error: 'Company ID and test type are required' });
    }
    
    if (!Object.values(TestType).includes(testType)) {
      return res.status(400).json({ error: 'Invalid test type' });
    }
    
    const validation = await creditService.validateTestCreation(companyId, testType);
    res.json(validation);
  } catch (error) {
    console.error('Error validating test creation:', error);
    res.status(500).json({ error: 'Failed to validate test creation' });
  }
});

// ============================================================================
// SUPER ADMIN CREDIT MANAGEMENT ROUTES
// ============================================================================

/**
 * POST /api/credits/assign - Assign credits to company (Super Admin only)
 */
router.post('/assign', authenticateToken, async (req: Request, res: Response) => {
  try {
    // TODO: Add super admin authorization check
    
    const { companyId, testType, amount, expiryDate, description } = req.body;
    
    if (!companyId || !testType || !amount) {
      return res.status(400).json({ 
        error: 'Company ID, test type, and amount are required' 
      });
    }
    
    if (!Object.values(TestType).includes(testType)) {
      return res.status(400).json({ error: 'Invalid test type' });
    }
    
    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }
    
    const createdBy = (req as any).user?.id;
    const expiry = expiryDate ? new Date(expiryDate) : undefined;
    
    await creditService.assignCredits(
      companyId, 
      testType, 
      amount, 
      expiry, 
      createdBy, 
      description
    );
    
    res.json({ 
      message: `Successfully assigned ${amount} ${testType} credits to company`,
      companyId,
      testType,
      amount,
      expiryDate: expiry
    });
  } catch (error) {
    console.error('Error assigning credits:', error);
    res.status(500).json({ error: 'Failed to assign credits' });
  }
});

/**
 * PUT /api/credits/permissions/:companyId - Update company test permissions (Super Admin only)
 */
router.put('/permissions/:companyId', authenticateToken, async (req: Request, res: Response) => {
  try {
    // TODO: Add super admin authorization check
    
    const { companyId } = req.params;
    const { permissions } = req.body;
    
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Permissions must be an array' });
    }
    
    // Validate all permissions are valid test types
    const invalidPermissions = permissions.filter(p => !Object.values(TestType).includes(p));
    if (invalidPermissions.length > 0) {
      return res.status(400).json({ 
        error: `Invalid test types: ${invalidPermissions.join(', ')}` 
      });
    }
    
    await creditService.setTestPermissions(companyId, permissions);
    
    res.json({ 
      message: 'Test permissions updated successfully',
      companyId,
      permissions 
    });
  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

/**
 * POST /api/credits/refund - Refund credits from transaction (Super Admin only)
 */
router.post('/refund', authenticateToken, async (req: Request, res: Response) => {
  try {
    // TODO: Add super admin authorization check
    
    const { transactionId, reason } = req.body;
    
    if (!transactionId || !reason) {
      return res.status(400).json({ 
        error: 'Transaction ID and reason are required' 
      });
    }
    
    const refundedBy = (req as any).user?.id;
    
    await creditService.refundCredits(transactionId, reason, refundedBy);
    
    res.json({ 
      message: 'Credits refunded successfully',
      transactionId,
      reason 
    });
  } catch (error) {
    console.error('Error refunding credits:', error);
    const message = error instanceof Error ? error.message : 'Failed to refund credits';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/credits/global-stats - Get global credit statistics (Super Admin only)
 */
router.get('/global-stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    // TODO: Add super admin authorization check
    
    const stats = await creditService.getGlobalCreditStats();
    res.json({ stats });
  } catch (error) {
    console.error('Error fetching global stats:', error);
    res.status(500).json({ error: 'Failed to fetch global statistics' });
  }
});

/**
 * POST /api/credits/expire-old - Manually expire old credits (Super Admin only)
 */
router.post('/expire-old', authenticateToken, async (req: Request, res: Response) => {
  try {
    // TODO: Add super admin authorization check
    
    await creditService.expireOldCredits();
    
    res.json({ 
      message: 'Old credits expired successfully' 
    });
  } catch (error) {
    console.error('Error expiring old credits:', error);
    res.status(500).json({ error: 'Failed to expire old credits' });
  }
});

// ============================================================================
// INTERNAL ROUTES (For system use)
// ============================================================================

/**
 * POST /api/credits/consume - Consume credits (Internal use)
 */
router.post('/consume', async (req: Request, res: Response) => {
  try {
    // TODO: Add internal API key validation
    
    const { companyId, testType, amount, referenceId, referenceType } = req.body;
    
    if (!companyId || !testType || !referenceId) {
      return res.status(400).json({ 
        error: 'Company ID, test type, and reference ID are required' 
      });
    }
    
    const result = await creditService.consumeCredits(
      companyId,
      testType,
      amount || 1,
      referenceId,
      referenceType || 'test'
    );
    
    if (result.success) {
      res.json({ 
        message: 'Credits consumed successfully',
        transactionId: result.transactionId 
      });
    } else {
      res.status(402).json({ 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('Error consuming credits:', error);
    res.status(500).json({ error: 'Failed to consume credits' });
  }
});

export default router; 