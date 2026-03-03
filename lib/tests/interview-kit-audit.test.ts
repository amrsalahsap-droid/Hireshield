import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

// Mock the dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe('Interview Kit Audit Events', () => {
  let mockPrisma: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { prisma } = await import('@/lib/prisma');
    mockPrisma = vi.mocked(prisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create audit log for interview kit request', async () => {
    vi.mocked(mockPrisma.auditLog.create).mockResolvedValue({ id: 'audit-123' } as any);

    await createAuditLog({
      orgId: 'org-123',
      actorUserId: 'user-123',
      action: AUDIT_ACTIONS.JOB_INTERVIEW_KIT_REQUESTED,
      entityType: 'JOB',
      entityId: 'job-123',
      metadata: {
        requestId: 'req-123',
        force: false,
      },
    });

    expect(vi.mocked(mockPrisma.auditLog.create)).toHaveBeenCalledWith({
      data: {
        orgId: 'org-123',
        actorUserId: 'user-123',
        action: 'JOB_INTERVIEW_KIT_REQUESTED',
        entityType: 'JOB',
        entityId: 'job-123',
        metadataJson: {
          requestId: 'req-123',
          timestamp: expect.any(String),
        },
      },
    });
  });

  it('should create audit log for interview kit completion', async () => {
    vi.mocked(mockPrisma.auditLog.create).mockResolvedValue({ id: 'audit-456' } as any);

    await createAuditLog({
      orgId: 'org-123',
      actorUserId: 'user-123',
      action: AUDIT_ACTIONS.JOB_INTERVIEW_KIT_COMPLETED,
      entityType: 'JOB',
      entityId: 'job-123',
      metadata: {
        requestId: 'req-123',
        promptVersion: '1.0',
        force: false,
      },
    });

    expect(vi.mocked(mockPrisma.auditLog.create)).toHaveBeenCalledWith({
      data: {
        orgId: 'org-123',
        actorUserId: 'user-123',
        action: 'JOB_INTERVIEW_KIT_COMPLETED',
        entityType: 'JOB',
        entityId: 'job-123',
        metadataJson: {
          requestId: 'req-123',
          timestamp: expect.any(String),
        },
      },
    });
  });

  it('should create audit log for interview kit failure', async () => {
    vi.mocked(mockPrisma.auditLog.create).mockResolvedValue({ id: 'audit-789' } as any);

    await createAuditLog({
      orgId: 'org-123',
      actorUserId: 'user-123',
      action: AUDIT_ACTIONS.JOB_INTERVIEW_KIT_FAILED,
      entityType: 'JOB',
      entityId: 'job-123',
      metadata: {
        requestId: 'req-123',
        promptVersion: '1.0',
        error: 'AI service unavailable',
        errorCode: 'TIMEOUT',
      },
    });

    expect(vi.mocked(mockPrisma.auditLog.create)).toHaveBeenCalledWith({
      data: {
        orgId: 'org-123',
        actorUserId: 'user-123',
        action: 'JOB_INTERVIEW_KIT_FAILED',
        entityType: 'JOB',
        entityId: 'job-123',
        metadataJson: {
          requestId: 'req-123',
          timestamp: expect.any(String),
        },
      },
    });
  });

  it('should keep metadata minimal - only requestId and timestamp', async () => {
    vi.mocked(mockPrisma.auditLog.create).mockResolvedValue({ id: 'audit-999' } as any);

    await createAuditLog({
      orgId: 'org-123',
      actorUserId: 'user-123',
      action: AUDIT_ACTIONS.JOB_INTERVIEW_KIT_REQUESTED,
      entityType: 'JOB',
      entityId: 'job-123',
      metadata: {
        requestId: 'req-123',
        force: false,
        promptVersion: '1.0',
        extraField: 'should be filtered out',
        anotherField: 'also filtered',
      },
    });

    expect(vi.mocked(mockPrisma.auditLog.create)).toHaveBeenCalledWith({
      data: {
        orgId: 'org-123',
        actorUserId: 'user-123',
        action: 'JOB_INTERVIEW_KIT_REQUESTED',
        entityType: 'JOB',
        entityId: 'job-123',
        metadataJson: {
          requestId: 'req-123',
          timestamp: expect.any(String),
        },
      },
    });
  });

  it('should handle audit logging failures gracefully', async () => {
    vi.mocked(mockPrisma.auditLog.create).mockRejectedValue(new Error('Database error'));

    // Should not throw error
    await expect(
      createAuditLog({
        orgId: 'org-123',
        actorUserId: 'user-123',
        action: AUDIT_ACTIONS.JOB_INTERVIEW_KIT_REQUESTED,
        entityType: 'JOB',
        entityId: 'job-123',
        metadata: {
          requestId: 'req-123',
        },
      })
    ).resolves.toBeUndefined();
  });

  it('should verify all required audit actions exist', () => {
    expect(AUDIT_ACTIONS.JOB_INTERVIEW_KIT_REQUESTED).toBe('JOB_INTERVIEW_KIT_REQUESTED');
    expect(AUDIT_ACTIONS.JOB_INTERVIEW_KIT_COMPLETED).toBe('JOB_INTERVIEW_KIT_COMPLETED');
    expect(AUDIT_ACTIONS.JOB_INTERVIEW_KIT_FAILED).toBe('JOB_INTERVIEW_KIT_FAILED');
  });
});
