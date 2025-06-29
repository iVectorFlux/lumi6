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
      // Get or create company test config record
      let companyTestConfig = await tx.companyTestConfig.findUnique({
        where: { companyId_testType: { companyId, testType } }
      });

      const balanceBefore = companyTestConfig?.availableCredits || 0;
      const balanceAfter = balanceBefore + amount;

      if (companyTestConfig) {
        // Update existing config record
        await tx.companyTestConfig.update({
          where: { id: companyTestConfig.id },
          data: {
            totalCredits: { increment: amount },
            availableCredits: { increment: amount },
            expiryDate: expiryDate || companyTestConfig.expiryDate,
            updatedAt: new Date()
          }
        });
      } else {
        // Create new config record
        await tx.companyTestConfig.create({
          data: {
            companyId,
            testType,
            isEnabled: true, // Enable by default when assigning credits
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
        // Get company test config
        const companyConfig = await tx.companyTestConfig.findUnique({
          where: { companyId_testType: { companyId, testType } }
        });

        if (!companyConfig || !companyConfig.isEnabled) {
          throw new Error(`Company not authorized for ${testType} tests`);
        }

        if (!companyConfig.isActive) {
          throw new Error(`${testType} test configuration is not active`);
        }

        // Check if credits have expired
        if (companyConfig.expiryDate && companyConfig.expiryDate < new Date()) {
          throw new Error(`Credits for ${testType} tests have expired`);
        }

        // Check if sufficient credits available
        if (companyConfig.availableCredits < amount) {
          throw new Error(`Insufficient ${testType} credits. Available: ${companyConfig.availableCredits}, Required: ${amount}`);
        }

        const balanceBefore = companyConfig.availableCredits;
        const balanceAfter = balanceBefore - amount;

        // Update config record
        await tx.companyTestConfig.update({
          where: { id: companyConfig.id },
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
    const configs = await prisma.companyTestConfig.findMany({
      where: { companyId },
      orderBy: { testType: 'asc' }
    });

    return configs.map(config => ({
      testType: config.testType,
      totalCredits: config.totalCredits,
      usedCredits: config.usedCredits,
      availableCredits: config.availableCredits,
      expiryDate: config.expiryDate || undefined,
      isActive: config.isActive
    }));
  }

  /**
   * Get credit balance for a specific test type
   */
  async getCreditBalance(companyId: string, testType: TestType): Promise<number> {
    const config = await prisma.companyTestConfig.findUnique({
      where: { companyId_testType: { companyId, testType } }
    });

    if (!config || !config.isActive || !config.isEnabled) return 0;
    if (config.expiryDate && config.expiryDate < new Date()) return 0;

    return config.availableCredits;
  }

  // ============================================================================
  // PERMISSION MANAGEMENT
  // ============================================================================

  /**
   * Set test permissions for a company
   */
  async setTestPermissions(companyId: string, permissions: TestType[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Get all existing configs for this company
      const existingConfigs = await tx.companyTestConfig.findMany({
        where: { companyId }
      });

      // Update existing configs
      for (const config of existingConfigs) {
        const shouldBeEnabled = permissions.includes(config.testType);
        if (config.isEnabled !== shouldBeEnabled) {
          await tx.companyTestConfig.update({
            where: { id: config.id },
            data: { 
              isEnabled: shouldBeEnabled,
              updatedAt: new Date()
            }
          });
        }
      }

      // Create configs for new permissions that don't exist yet
      const existingTestTypes = existingConfigs.map(c => c.testType);
      const newPermissions = permissions.filter(p => !existingTestTypes.includes(p));
      
      if (newPermissions.length > 0) {
        await tx.companyTestConfig.createMany({
          data: newPermissions.map(testType => ({
            companyId,
            testType,
            isEnabled: true,
            totalCredits: 0,
            usedCredits: 0,
            availableCredits: 0,
            isActive: true
          }))
        });
      }
    });
  }

  /**
   * Check if company has permission for a test type
   */
  async hasTestPermission(companyId: string, testType: TestType): Promise<boolean> {
    const config = await prisma.companyTestConfig.findUnique({
      where: { companyId_testType: { companyId, testType } }
    });

    return config ? config.isEnabled && config.isActive : false;
  }

  /**
   * Get all test permissions for a company
   */
  async getCompanyPermissions(companyId: string): Promise<TestType[]> {
    const configs = await prisma.companyTestConfig.findMany({
      where: { 
        companyId, 
        isEnabled: true,
        isActive: true
      },
      select: { testType: true }
    });

    return configs.map(c => c.testType);
  }

  /**
   * Enable/disable a specific test permission
   */
  async toggleTestPermission(companyId: string, testType: TestType, isEnabled: boolean): Promise<void> {
    await prisma.companyTestConfig.upsert({
      where: { companyId_testType: { companyId, testType } },
      update: { 
        isEnabled, 
        updatedAt: new Date() 
      },
      create: { 
        companyId, 
        testType, 
        isEnabled,
        totalCredits: 0,
        usedCredits: 0,
        availableCredits: 0,
        isActive: true
      }
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

      // Get current config record
      const companyConfig = await tx.companyTestConfig.findUnique({
        where: { companyId_testType: { companyId, testType } }
      });

      if (!companyConfig) {
        throw new Error('Company test configuration not found');
      }

      const balanceBefore = companyConfig.availableCredits;
      const balanceAfter = balanceBefore + refundAmount;

      // Update config record
      await tx.companyTestConfig.update({
        where: { id: companyConfig.id },
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
   * Get global credit statistics for super admin
   */
  async getGlobalCreditStats() {
    const totalCompanies = await prisma.company.count();
    
    const configs = await prisma.companyTestConfig.findMany({
      where: { isActive: true },
      select: {
        testType: true,
        totalCredits: true,
        usedCredits: true,
        availableCredits: true
      }
    });

    const stats = configs.reduce((acc, config) => {
      if (!acc[config.testType]) {
        acc[config.testType] = {
          totalCredits: 0,
          usedCredits: 0,
          availableCredits: 0,
          companies: 0
        };
      }
      acc[config.testType].totalCredits += config.totalCredits;
      acc[config.testType].usedCredits += config.usedCredits;
      acc[config.testType].availableCredits += config.availableCredits;
      acc[config.testType].companies += 1;
      return acc;
    }, {} as Record<TestType, { totalCredits: number; usedCredits: number; availableCredits: number; companies: number }>);

    return {
      totalCompanies,
      testTypeStats: stats
    };
  }

  /**
   * Expire old credits based on expiry date
   */
  async expireOldCredits(): Promise<void> {
    const now = new Date();
    
    const expiredConfigs = await prisma.companyTestConfig.findMany({
      where: {
        expiryDate: { lt: now },
        availableCredits: { gt: 0 },
        isActive: true
      }
    });

    for (const config of expiredConfigs) {
      await prisma.$transaction(async (tx) => {
        const expiredAmount = config.availableCredits;
        
        // Update config to zero out expired credits
        await tx.companyTestConfig.update({
          where: { id: config.id },
          data: {
            availableCredits: 0,
            updatedAt: new Date()
          }
        });

        // Create expiry transaction
        await tx.creditTransaction.create({
          data: {
            companyId: config.companyId,
            testType: config.testType,
            transactionType: CreditTransactionType.EXPIRY,
            amount: -expiredAmount,
            balanceBefore: config.availableCredits,
            balanceAfter: 0,
            description: `Expired ${expiredAmount} ${config.testType} credits`,
            referenceType: 'expiry'
          }
        });
      });
    }
  }

  /**
   * Validate if company can create a test
   */
  async validateTestCreation(companyId: string, testType: TestType): Promise<{
    canCreate: boolean;
    error?: string;
    availableCredits?: number;
  }> {
    const config = await prisma.companyTestConfig.findUnique({
      where: { companyId_testType: { companyId, testType } }
    });

    if (!config) {
      return {
        canCreate: false,
        error: `No configuration found for ${testType} tests`,
        availableCredits: 0
      };
    }

    if (!config.isEnabled) {
      return {
        canCreate: false,
        error: `${testType} tests are not enabled for this company`,
        availableCredits: config.availableCredits
      };
    }

    if (!config.isActive) {
      return {
        canCreate: false,
        error: `${testType} test configuration is not active`,
        availableCredits: config.availableCredits
      };
    }

    if (config.expiryDate && config.expiryDate < new Date()) {
      return {
        canCreate: false,
        error: `${testType} credits have expired`,
        availableCredits: 0
      };
    }

    if (config.availableCredits <= 0) {
      return {
        canCreate: false,
        error: `No available ${testType} credits`,
        availableCredits: 0
      };
    }

    return {
      canCreate: true,
      availableCredits: config.availableCredits
    };
  }
}

export const creditService = new CreditService();
export default creditService; 