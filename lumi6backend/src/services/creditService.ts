import { PrismaClient, TestType, CreditTransactionType } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreditBalance {
  testType: TestType;
  totalCredits: number;
  usedCredits: number;
  availableCredits: number;
  expiryDate?: Date;
  isActive: boolean;
}

export interface TransactionFilters {
  testType?: TestType;
  transactionType?: CreditTransactionType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class CreditService {
  
  // ============================================================================
  // CREDIT MANAGEMENT
  // ============================================================================
  
  /**
   * Assign credits to a company for a specific test type
   */
  async assignCredits(
    companyId: string, 
    testType: TestType, 
    amount: number, 
    expiryDate?: Date,
    createdBy?: string,
    description?: string
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Get or create company credit record
      let companyCredit = await tx.companyCredit.findUnique({
        where: { companyId_testType: { companyId, testType } }
      });

      const balanceBefore = companyCredit?.availableCredits || 0;
      const balanceAfter = balanceBefore + amount;

      if (companyCredit) {
        // Update existing credit record
        await tx.companyCredit.update({
          where: { id: companyCredit.id },
          data: {
            totalCredits: { increment: amount },
            availableCredits: { increment: amount },
            expiryDate: expiryDate || companyCredit.expiryDate,
            updatedAt: new Date()
          }
        });
      } else {
        // Create new credit record
        await tx.companyCredit.create({
          data: {
            companyId,
            testType,
            totalCredits: amount,
            usedCredits: 0,
            availableCredits: amount,
            expiryDate,
            isActive: true
          }
        });
      }

      // Create transaction record
      await tx.creditTransaction.create({
        data: {
          companyId,
          testType,
          transactionType: CreditTransactionType.PURCHASE,
          amount,
          balanceBefore,
          balanceAfter,
          description: description || `Assigned ${amount} ${testType} credits`,
          referenceType: 'assignment',
          createdBy
        }
      });
    });
  }

  /**
   * Consume credits for a test
   */
  async consumeCredits(
    companyId: string, 
    testType: TestType, 
    amount: number = 1,
    referenceId: string,
    referenceType: string = 'test'
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Check if company has permission for this test type
        const permission = await tx.companyTestPermission.findUnique({
          where: { companyId_testType: { companyId, testType } }
        });

        if (!permission || !permission.isEnabled) {
          throw new Error(`Company not authorized for ${testType} tests`);
        }

        // Get company credit record
        const companyCredit = await tx.companyCredit.findUnique({
          where: { companyId_testType: { companyId, testType } }
        });

        if (!companyCredit || !companyCredit.isActive) {
          throw new Error(`No active credits found for ${testType} tests`);
        }

        // Check if credits have expired
        if (companyCredit.expiryDate && companyCredit.expiryDate < new Date()) {
          throw new Error(`Credits for ${testType} tests have expired`);
        }

        // Check if sufficient credits available
        if (companyCredit.availableCredits < amount) {
          throw new Error(`Insufficient ${testType} credits. Available: ${companyCredit.availableCredits}, Required: ${amount}`);
        }

        const balanceBefore = companyCredit.availableCredits;
        const balanceAfter = balanceBefore - amount;

        // Update credit record
        await tx.companyCredit.update({
          where: { id: companyCredit.id },
          data: {
            usedCredits: { increment: amount },
            availableCredits: { decrement: amount },
            updatedAt: new Date()
          }
        });

        // Create transaction record
        const transaction = await tx.creditTransaction.create({
          data: {
            companyId,
            testType,
            transactionType: CreditTransactionType.CONSUMPTION,
            amount: -amount, // Negative for consumption
            balanceBefore,
            balanceAfter,
            description: `Consumed ${amount} ${testType} credit(s) for test`,
            referenceId,
            referenceType
          }
        });

        return { success: true, transactionId: transaction.id };
      });

      return result;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get company credit balances for all test types
   */
  async getCompanyCredits(companyId: string): Promise<CreditBalance[]> {
    const credits = await prisma.companyCredit.findMany({
      where: { companyId },
      orderBy: { testType: 'asc' }
    });

    return credits.map(credit => ({
      testType: credit.testType,
      totalCredits: credit.totalCredits,
      usedCredits: credit.usedCredits,
      availableCredits: credit.availableCredits,
      expiryDate: credit.expiryDate || undefined,
      isActive: credit.isActive
    }));
  }

  /**
   * Get credit balance for a specific test type
   */
  async getCreditBalance(companyId: string, testType: TestType): Promise<number> {
    const credit = await prisma.companyCredit.findUnique({
      where: { companyId_testType: { companyId, testType } }
    });

    if (!credit || !credit.isActive) return 0;
    if (credit.expiryDate && credit.expiryDate < new Date()) return 0;

    return credit.availableCredits;
  }

  // ============================================================================
  // PERMISSION MANAGEMENT
  // ============================================================================

  /**
   * Set test permissions for a company
   */
  async setTestPermissions(companyId: string, permissions: TestType[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Remove all existing permissions
      await tx.companyTestPermission.deleteMany({
        where: { companyId }
      });

      // Add new permissions
      if (permissions.length > 0) {
        await tx.companyTestPermission.createMany({
          data: permissions.map(testType => ({
            companyId,
            testType,
            isEnabled: true
          }))
        });
      }
    });
  }

  /**
   * Check if company has permission for a test type
   */
  async hasTestPermission(companyId: string, testType: TestType): Promise<boolean> {
    const permission = await prisma.companyTestPermission.findUnique({
      where: { companyId_testType: { companyId, testType } }
    });

    return permission ? permission.isEnabled : false;
  }

  /**
   * Get all test permissions for a company
   */
  async getCompanyPermissions(companyId: string): Promise<TestType[]> {
    const permissions = await prisma.companyTestPermission.findMany({
      where: { companyId, isEnabled: true },
      select: { testType: true }
    });

    return permissions.map(p => p.testType);
  }

  /**
   * Enable/disable a specific test permission
   */
  async toggleTestPermission(companyId: string, testType: TestType, isEnabled: boolean): Promise<void> {
    await prisma.companyTestPermission.upsert({
      where: { companyId_testType: { companyId, testType } },
      update: { isEnabled, updatedAt: new Date() },
      create: { companyId, testType, isEnabled }
    });
  }

  // ============================================================================
  // TRANSACTION HISTORY
  // ============================================================================

  /**
   * Get credit transaction history for a company
   */
  async getCreditTransactions(companyId: string, filters?: TransactionFilters) {
    const where: any = { companyId };

    if (filters?.testType) where.testType = filters.testType;
    if (filters?.transactionType) where.transactionType = filters.transactionType;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const transactions = await prisma.creditTransaction.findMany({
      where,
      include: {
        createdByAdmin: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0
    });

    return transactions;
  }

  /**
   * Refund credits from a transaction
   */
  async refundCredits(transactionId: string, reason: string, refundedBy?: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Get original transaction
      const originalTransaction = await tx.creditTransaction.findUnique({
        where: { id: transactionId }
      });

      if (!originalTransaction) {
        throw new Error('Transaction not found');
      }

      if (originalTransaction.transactionType !== CreditTransactionType.CONSUMPTION) {
        throw new Error('Can only refund consumption transactions');
      }

      const refundAmount = Math.abs(originalTransaction.amount); // Make positive
      const companyId = originalTransaction.companyId;
      const testType = originalTransaction.testType;

      // Get current credit record
      const companyCredit = await tx.companyCredit.findUnique({
        where: { companyId_testType: { companyId, testType } }
      });

      if (!companyCredit) {
        throw new Error('Company credit record not found');
      }

      const balanceBefore = companyCredit.availableCredits;
      const balanceAfter = balanceBefore + refundAmount;

      // Update credit record
      await tx.companyCredit.update({
        where: { id: companyCredit.id },
        data: {
          usedCredits: { decrement: refundAmount },
          availableCredits: { increment: refundAmount },
          updatedAt: new Date()
        }
      });

      // Create refund transaction
      await tx.creditTransaction.create({
        data: {
          companyId,
          testType,
          transactionType: CreditTransactionType.REFUND,
          amount: refundAmount,
          balanceBefore,
          balanceAfter,
          description: `Refund: ${reason}`,
          referenceId: transactionId,
          referenceType: 'refund',
          createdBy: refundedBy
        }
      });
    });
  }

  // ============================================================================
  // ANALYTICS & REPORTING
  // ============================================================================

  /**
   * Get company credit usage analytics
   */
  async getCreditAnalytics(companyId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const transactions = await prisma.creditTransaction.findMany({
      where: {
        companyId,
        createdAt: { gte: startDate },
        transactionType: CreditTransactionType.CONSUMPTION
      },
      select: {
        testType: true,
        amount: true,
        createdAt: true
      }
    });

    // Group by test type
    const analytics = transactions.reduce((acc, transaction) => {
      const testType = transaction.testType;
      if (!acc[testType]) {
        acc[testType] = { consumed: 0, tests: 0 };
      }
      acc[testType].consumed += Math.abs(transaction.amount);
      acc[testType].tests += 1;
      return acc;
    }, {} as Record<TestType, { consumed: number; tests: number }>);

    return analytics;
  }

  /**
   * Get global credit usage statistics (for super admin)
   */
  async getGlobalCreditStats() {
    const stats = await prisma.companyCredit.groupBy({
      by: ['testType'],
      _sum: {
        totalCredits: true,
        usedCredits: true,
        availableCredits: true
      },
      _count: {
        id: true
      }
    });

    return stats.map(stat => ({
      testType: stat.testType,
      totalCredits: stat._sum.totalCredits || 0,
      usedCredits: stat._sum.usedCredits || 0,
      availableCredits: stat._sum.availableCredits || 0,
      companies: stat._count.id
    }));
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check and expire old credits
   */
  async expireOldCredits(): Promise<void> {
    const now = new Date();
    
    await prisma.$transaction(async (tx) => {
      // Find expired credits
      const expiredCredits = await tx.companyCredit.findMany({
        where: {
          expiryDate: { lt: now },
          isActive: true,
          availableCredits: { gt: 0 }
        }
      });

      // Process each expired credit
      for (const credit of expiredCredits) {
        const expiredAmount = credit.availableCredits;
        
        // Update credit record
        await tx.companyCredit.update({
          where: { id: credit.id },
          data: {
            availableCredits: 0,
            isActive: false,
            updatedAt: now
          }
        });

        // Create expiry transaction
        await tx.creditTransaction.create({
          data: {
            companyId: credit.companyId,
            testType: credit.testType,
            transactionType: CreditTransactionType.EXPIRY,
            amount: -expiredAmount,
            balanceBefore: expiredAmount,
            balanceAfter: 0,
            description: `Credits expired on ${credit.expiryDate?.toISOString().split('T')[0]}`,
            referenceType: 'expiry'
          }
        });
      }
    });
  }

  /**
   * Validate test creation request
   */
  async validateTestCreation(companyId: string, testType: TestType): Promise<{
    canCreate: boolean;
    error?: string;
    availableCredits?: number;
  }> {
    // Check permission
    const hasPermission = await this.hasTestPermission(companyId, testType);
    if (!hasPermission) {
      return {
        canCreate: false,
        error: `Company not authorized for ${testType} tests`
      };
    }

    // Check credits
    const availableCredits = await this.getCreditBalance(companyId, testType);
    if (availableCredits < 1) {
      return {
        canCreate: false,
        error: `Insufficient ${testType} credits`,
        availableCredits
      };
    }

    return {
      canCreate: true,
      availableCredits
    };
  }
}

// Export singleton instance
export const creditService = new CreditService();
export default creditService; 