import { PrismaClient, TestStatus } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Service for recovering interrupted test sessions
 */
export class SessionRecoveryService {
  /**
   * Recover an interrupted test session for a candidate
   * @param candidateId The ID of the candidate
   * @param testId The ID of the test (optional)
   * @returns The recovered candidate test session or null if no recovery needed
   */
  async recoverSession(candidateId: string, testId?: string) {
    // Find the most recent in-progress test for this candidate
    const interruptedTest = await prisma.candidateTest.findFirst({
      where: {
        candidateId,
        status: 'active',
        ...(testId ? { testId } : {}),
      },
      include: {
        test: true,
        questions: {
          include: {
            question: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        responses: true,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (!interruptedTest) {
      return null; // No interrupted test found
    }

    // Determine the last answered question
    const lastResponseIndex = interruptedTest.responses.length;
    
    // Update the candidate test to set the current question index
    const updatedTest = await prisma.candidateTest.update({
      where: {
        id: interruptedTest.id,
      },
      data: {
        currentQuestionIndex: lastResponseIndex,
        // Keep status as in_progress
      },
      include: {
        test: true,
        questions: {
          include: {
            question: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        responses: true,
      },
    });

    return updatedTest;
  }

  /**
   * Check if a candidate has any in-progress tests
   * @param candidateId The ID of the candidate
   * @returns True if candidate has in-progress tests
   */
  async hasInterruptedSessions(candidateId: string) {
    const count = await prisma.candidateTest.count({
      where: {
        candidateId,
        status: 'active',
      },
    });
    
    return count > 0;
  }

  /**
   * Recover all sessions that have been idle for too long
   * @param maxIdleMinutes Maximum idle time in minutes before recovery
   */
  async recoverIdleSessions(maxIdleMinutes: number = 60) {
    const idleThreshold = new Date();
    idleThreshold.setMinutes(idleThreshold.getMinutes() - maxIdleMinutes);

    // Find candidate tests that are in progress but haven't been updated recently
    const idleSessions = await prisma.candidateTest.findMany({
      where: {
        status: 'active',
        // updatedAt: {
        //   lt: idleThreshold,
        // },
      },
    });

    // Update each idle session to be recoverable
    const updatePromises = idleSessions.map(session => 
      prisma.candidateTest.update({
        where: {
          id: session.id,
        },
        data: {
          // Mark as recoverable by setting a special flag
          // We don't change the status to maintain state
          test: {
            update: {
              status: 'active', // Ensure the test is still accessible
            },
          },
        },
      })
    );

    await Promise.all(updatePromises);
    
    return idleSessions.length;
  }
}

export default new SessionRecoveryService(); 