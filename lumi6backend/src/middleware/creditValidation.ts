import { Request, Response, NextFunction } from 'express';
import { creditService } from '../services/creditService';
import { TestType } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      creditValidation?: {
        companyId: string;
        testType: TestType;
        availableCredits: number;
      };
    }
  }
}

/**
 * Middleware to validate credits and permissions for test creation
 */
export const validateCreditsAndPermissions = (testType: TestType) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract company ID from request (could be from body, params, or user context)
      let companyId: string;
      
      if (req.body.companyId) {
        companyId = req.body.companyId;
      } else if (req.params.companyId) {
        companyId = req.params.companyId;
      } else if ((req as any).user?.companyId) {
        companyId = (req as any).user.companyId;
      } else {
        return res.status(400).json({ 
          error: 'Company ID not found in request' 
        });
      }

      // Validate test creation
      const validation = await creditService.validateTestCreation(companyId, testType);
      
      if (!validation.canCreate) {
        const statusCode = validation.error?.includes('not authorized') ? 403 : 402;
        return res.status(statusCode).json({ 
          error: validation.error,
          availableCredits: validation.availableCredits || 0,
          testType
        });
      }

      // Store validation info in request for later use
      req.creditValidation = {
        companyId,
        testType,
        availableCredits: validation.availableCredits || 0
      };

      next();
    } catch (error) {
      console.error('Credit validation error:', error);
      res.status(500).json({ 
        error: 'Failed to validate credits and permissions' 
      });
    }
  };
};

/**
 * Middleware to consume credits after successful test creation
 */
export const consumeCreditsAfterTest = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const validation = req.creditValidation;
    if (!validation) {
      return next(); // Skip if no validation data
    }

    // Get test ID from response or request
    const testId = res.locals.testId || req.body.testId || req.params.testId;
    if (!testId) {
      console.warn('No test ID found for credit consumption');
      return next();
    }

    // Consume credits
    const result = await creditService.consumeCredits(
      validation.companyId,
      validation.testType,
      1, // Default 1 credit per test
      testId,
      'test'
    );

    if (!result.success) {
      console.error('Failed to consume credits:', result.error);
      // Note: We don't fail the request here as the test was already created
      // This should be handled by a background job or manual intervention
    } else {
      // Store transaction ID for potential refund
      res.locals.creditTransactionId = result.transactionId;
    }

    next();
  } catch (error) {
    console.error('Credit consumption error:', error);
    next(); // Don't fail the request
  }
};

/**
 * Middleware to check if company has any test permissions
 */
export const requireAnyTestPermission = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    let companyId: string;
    
    if (req.body.companyId) {
      companyId = req.body.companyId;
    } else if (req.params.companyId) {
      companyId = req.params.companyId;
    } else if ((req as any).user?.companyId) {
      companyId = (req as any).user.companyId;
    } else {
      return res.status(400).json({ 
        error: 'Company ID not found in request' 
      });
    }

    const permissions = await creditService.getCompanyPermissions(companyId);
    
    if (permissions.length === 0) {
      return res.status(403).json({ 
        error: 'Company has no test permissions assigned' 
      });
    }

    // Store permissions in request for later use
    (req as any).companyPermissions = permissions;
    next();
  } catch (error) {
    console.error('Permission check error:', error);
    res.status(500).json({ 
      error: 'Failed to check test permissions' 
    });
  }
};

/**
 * Middleware to validate sufficient credits for bulk operations
 */
export const validateBulkCredits = (testType: TestType, quantityField: string = 'quantity') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quantity = parseInt(req.body[quantityField]) || 1;
      
      let companyId: string;
      if (req.body.companyId) {
        companyId = req.body.companyId;
      } else if ((req as any).user?.companyId) {
        companyId = (req as any).user.companyId;
      } else {
        return res.status(400).json({ 
          error: 'Company ID not found in request' 
        });
      }

      // Check permission
      const hasPermission = await creditService.hasTestPermission(companyId, testType);
      if (!hasPermission) {
        return res.status(403).json({ 
          error: `Company not authorized for ${testType} tests` 
        });
      }

      // Check credits
      const availableCredits = await creditService.getCreditBalance(companyId, testType);
      if (availableCredits < quantity) {
        return res.status(402).json({ 
          error: `Insufficient ${testType} credits. Required: ${quantity}, Available: ${availableCredits}`,
          availableCredits,
          requiredCredits: quantity,
          testType
        });
      }

      // Store validation info
      req.creditValidation = {
        companyId,
        testType,
        availableCredits
      };

      next();
    } catch (error) {
      console.error('Bulk credit validation error:', error);
      res.status(500).json({ 
        error: 'Failed to validate bulk credits' 
      });
    }
  };
};

/**
 * Helper function to get test type from route path
 */
export const getTestTypeFromRoute = (path: string): TestType | null => {
  if (path.includes('proficiency')) return TestType.PROFICIENCY;
  if (path.includes('eq')) return TestType.EQ;
  if (path.includes('writing')) return TestType.WRITING;
  if (path.includes('speaking')) return TestType.SPEAKING;
  return null;
};

/**
 * Dynamic middleware that detects test type from route
 */
export const validateCreditsFromRoute = (req: Request, res: Response, next: NextFunction) => {
  const testType = getTestTypeFromRoute(req.path);
  if (!testType) {
    return res.status(400).json({ 
      error: 'Could not determine test type from route' 
    });
  }

  return validateCreditsAndPermissions(testType)(req, res, next);
}; 