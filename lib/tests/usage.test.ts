import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UsageTracker, incrementInterviewKitUsage, getUsageSnapshot } from '@/lib/usage';

// Mock the dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    org: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

describe('Usage Tracking', () => {
  let mockPrisma: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { prisma } = await import('@/lib/prisma');
    mockPrisma = vi.mocked(prisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('incrementInterviewKitUsage', () => {
    it('should increment interview kit count successfully', async () => {
      vi.mocked(mockPrisma.org.update).mockResolvedValue({
        jdAnalysisCount: 5,
        interviewKitCount: 3,
      } as any);

      const result = await incrementInterviewKitUsage('org-123');

      expect(result.success).toBe(true);
      expect(result.usage.jdAnalysisCount).toBe(5);
      expect(result.usage.interviewKitCount).toBe(3);
      expect(result.usage.currentMonth).toBe(new Date().toLocaleString('default', { month: 'long' }));
      expect(result.usage.currentYear).toBe(new Date().getFullYear());

      expect(vi.mocked(mockPrisma.org.update)).toHaveBeenCalledWith({
        where: { id: 'org-123' },
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
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(mockPrisma.org.update).mockRejectedValue(new Error('Database error'));

      const result = await incrementInterviewKitUsage('org-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(result.usage.jdAnalysisCount).toBe(0);
      expect(result.usage.interviewKitCount).toBe(0);
    });
  });

  describe('getUsageSnapshot', () => {
    it('should return current usage snapshot', async () => {
      vi.mocked(mockPrisma.org.findUnique).mockResolvedValue({
        jdAnalysisCount: 10,
        interviewKitCount: 7,
      } as any);

      const snapshot = await getUsageSnapshot('org-123');

      expect(snapshot).toEqual({
        jdAnalysisCount: 10,
        interviewKitCount: 7,
        currentMonth: new Date().toLocaleString('default', { month: 'long' }),
        currentYear: new Date().getFullYear(),
      });

      expect(vi.mocked(mockPrisma.org.findUnique)).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        select: {
          jdAnalysisCount: true,
          interviewKitCount: true,
        },
      });
    });

    it('should return null when org not found', async () => {
      vi.mocked(mockPrisma.org.findUnique).mockResolvedValue(null);

      const snapshot = await getUsageSnapshot('org-123');

      expect(snapshot).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(mockPrisma.org.findUnique).mockRejectedValue(new Error('Database error'));

      const snapshot = await getUsageSnapshot('org-123');

      expect(snapshot).toBeNull();
    });
  });

  describe('UsageTracker.checkUsageLimits', () => {
    it('should return within limits when under all limits', async () => {
      vi.mocked(mockPrisma.org.findUnique).mockResolvedValue({
        jdAnalysisCount: 5,
        interviewKitCount: 3,
      } as any);

      const result = await UsageTracker.checkUsageLimits('org-123', {
        maxInterviewKitsPerMonth: 10,
        maxJdAnalysesPerMonth: 10,
      });

      expect(result.withinLimits).toBe(true);
      expect(result.usage?.jdAnalysisCount).toBe(5);
      expect(result.usage?.interviewKitCount).toBe(3);
      expect(result.exceededLimits).toEqual([]);
    });

    it('should identify exceeded interview kit limit', async () => {
      vi.mocked(mockPrisma.org.findUnique).mockResolvedValue({
        jdAnalysisCount: 5,
        interviewKitCount: 15,
      } as any);

      const result = await UsageTracker.checkUsageLimits('org-123', {
        maxInterviewKitsPerMonth: 10,
        maxJdAnalysesPerMonth: 10,
      });

      expect(result.withinLimits).toBe(false);
      expect(result.exceededLimits).toEqual(['Interview kit limit exceeded']);
    });

    it('should identify exceeded JD analysis limit', async () => {
      vi.mocked(mockPrisma.org.findUnique).mockResolvedValue({
        jdAnalysisCount: 12,
        interviewKitCount: 3,
      } as any);

      const result = await UsageTracker.checkUsageLimits('org-123', {
        maxInterviewKitsPerMonth: 10,
        maxJdAnalysesPerMonth: 10,
      });

      expect(result.withinLimits).toBe(false);
      expect(result.exceededLimits).toEqual(['JD analysis limit exceeded']);
    });

    it('should identify multiple exceeded limits', async () => {
      vi.mocked(mockPrisma.org.findUnique).mockResolvedValue({
        jdAnalysisCount: 15,
        interviewKitCount: 12,
      } as any);

      const result = await UsageTracker.checkUsageLimits('org-123', {
        maxInterviewKitsPerMonth: 10,
        maxJdAnalysesPerMonth: 10,
      });

      expect(result.withinLimits).toBe(false);
      expect(result.exceededLimits).toEqual(['Interview kit limit exceeded', 'JD analysis limit exceeded']);
    });

    it('should handle org not found', async () => {
      vi.mocked(mockPrisma.org.findUnique).mockResolvedValue(null);

      const result = await UsageTracker.checkUsageLimits('org-123', {
        maxInterviewKitsPerMonth: 10,
      });

      expect(result.withinLimits).toBe(false);
      expect(result.usage).toBeNull();
      expect(result.exceededLimits).toEqual(['Organization not found']);
    });
  });

  describe('UsageTracker.resetMonthlyUsage', () => {
    it('should reset monthly usage counters', async () => {
      vi.mocked(mockPrisma.org.update).mockResolvedValue({
        jdAnalysisCount: 0,
        interviewKitCount: 0,
      } as any);

      const result = await UsageTracker.resetMonthlyUsage('org-123');

      expect(result.success).toBe(true);
      expect(result.usage.jdAnalysisCount).toBe(0);
      expect(result.usage.interviewKitCount).toBe(0);

      expect(vi.mocked(mockPrisma.org.update)).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        data: {
          jdAnalysisCount: 0,
          interviewKitCount: 0,
        },
        select: {
          jdAnalysisCount: true,
          interviewKitCount: true,
        },
      });
    });

    it('should handle reset errors gracefully', async () => {
      vi.mocked(mockPrisma.org.update).mockRejectedValue(new Error('Database error'));

      const result = await UsageTracker.resetMonthlyUsage('org-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });
});
