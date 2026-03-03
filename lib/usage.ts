import { prisma } from '@/lib/prisma';

export interface UsageSnapshot {
  jdAnalysisCount: number;
  interviewKitCount: number;
  currentMonth: string;
  currentYear: number;
}

export interface UsageIncrementResult {
  success: boolean;
  usage: UsageSnapshot;
  error?: string;
}

/**
 * Centralized usage tracking helper
 * This can be used by Stripe integration for billing and usage limits
 */
export class UsageTracker {
  /**
   * Increment interview kit usage for an organization
   * Only increments when not cached (actual generation)
   */
  static async incrementInterviewKitUsage(orgId: string): Promise<UsageIncrementResult> {
    try {
      // Increment the counter atomically
      const updatedOrg = await prisma.org.update({
        where: { id: orgId },
        data: {
          interviewKitCount: {
            increment: 1,
          },
        },
        select: {
          jdAnalysisCount: true,
          interviewKitCount: true,
        },
      });

      const usage: UsageSnapshot = {
        jdAnalysisCount: updatedOrg.jdAnalysisCount,
        interviewKitCount: updatedOrg.interviewKitCount,
        currentMonth: new Date().toLocaleString('default', { month: 'long' }),
        currentYear: new Date().getFullYear(),
      };

      return {
        success: true,
        usage,
      };
    } catch (error) {
      console.error('Failed to increment interview kit usage:', error);
      return {
        success: false,
        usage: {
          jdAnalysisCount: 0,
          interviewKitCount: 0,
          currentMonth: new Date().toLocaleString('default', { month: 'long' }),
          currentYear: new Date().getFullYear(),
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get current usage snapshot for an organization
   */
  static async getUsageSnapshot(orgId: string): Promise<UsageSnapshot | null> {
    try {
      const org = await prisma.org.findUnique({
        where: { id: orgId },
        select: {
          jdAnalysisCount: true,
          interviewKitCount: true,
        },
      });

      if (!org) {
        return null;
      }

      return {
        jdAnalysisCount: org.jdAnalysisCount,
        interviewKitCount: org.interviewKitCount,
        currentMonth: new Date().toLocaleString('default', { month: 'long' }),
        currentYear: new Date().getFullYear(),
      };
    } catch (error) {
      console.error('Failed to get usage snapshot:', error);
      return null;
    }
  }

  /**
   * Check if organization has exceeded usage limits
   * Can be used by Stripe integration for billing enforcement
   */
  static async checkUsageLimits(orgId: string, limits: {
    maxInterviewKitsPerMonth?: number;
    maxJdAnalysesPerMonth?: number;
  }): Promise<{
    withinLimits: boolean;
    usage: UsageSnapshot | null;
    exceededLimits: string[];
  }> {
    const usage = await this.getUsageSnapshot(orgId);
    
    if (!usage) {
      return {
        withinLimits: false,
        usage: null,
        exceededLimits: ['Organization not found'],
      };
    }

    const exceededLimits: string[] = [];

    if (limits.maxInterviewKitsPerMonth && usage.interviewKitCount >= limits.maxInterviewKitsPerMonth) {
      exceededLimits.push('Interview kit limit exceeded');
    }

    if (limits.maxJdAnalysesPerMonth && usage.jdAnalysisCount >= limits.maxJdAnalysesPerMonth) {
      exceededLimits.push('JD analysis limit exceeded');
    }

    return {
      withinLimits: exceededLimits.length === 0,
      usage,
      exceededLimits,
    };
  }

  /**
   * Reset monthly usage counters (for billing cycle reset)
   * Can be used by Stripe integration for monthly billing
   */
  static async resetMonthlyUsage(orgId: string): Promise<UsageIncrementResult> {
    try {
      const updatedOrg = await prisma.org.update({
        where: { id: orgId },
        data: {
          jdAnalysisCount: 0,
          interviewKitCount: 0,
        },
        select: {
          jdAnalysisCount: true,
          interviewKitCount: true,
        },
      });

      const usage: UsageSnapshot = {
        jdAnalysisCount: updatedOrg.jdAnalysisCount,
        interviewKitCount: updatedOrg.interviewKitCount,
        currentMonth: new Date().toLocaleString('default', { month: 'long' }),
        currentYear: new Date().getFullYear(),
      };

      return {
        success: true,
        usage,
      };
    } catch (error) {
      console.error('Failed to reset monthly usage:', error);
      return {
        success: false,
        usage: {
          jdAnalysisCount: 0,
          interviewKitCount: 0,
          currentMonth: new Date().toLocaleString('default', { month: 'long' }),
          currentYear: new Date().getFullYear(),
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Convenience function for incrementing interview kit usage
 * This is the main function that should be used in the API route
 */
export async function incrementInterviewKitUsage(orgId: string): Promise<UsageIncrementResult> {
  return UsageTracker.incrementInterviewKitUsage(orgId);
}

/**
 * Convenience function for getting usage snapshot
 * This can be used to return usage information to clients
 */
export async function getUsageSnapshot(orgId: string): Promise<UsageSnapshot | null> {
  return UsageTracker.getUsageSnapshot(orgId);
}
