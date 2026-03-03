import { prisma } from '@/lib/prisma';

export interface AuditLogMetadata {
  requestId?: string;
  [key: string]: any;
}

export async function createAuditLog({
  orgId,
  actorUserId,
  action,
  entityType,
  entityId,
  metadata,
}: {
  orgId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: AuditLogMetadata;
}) {
  try {
    // Keep metadata small - only include essential fields
    const filteredMetadata: AuditLogMetadata = {};
    
    if (metadata?.requestId) {
      filteredMetadata.requestId = metadata.requestId;
    }
    
    // Add timestamp if not present
    filteredMetadata.timestamp = new Date().toISOString();
    
    await prisma.auditLog.create({
      data: {
        orgId,
        actorUserId,
        action,
        entityType,
        entityId,
        metadataJson: Object.keys(filteredMetadata).length > 0 ? filteredMetadata as any : undefined,
      },
    });
  } catch (error) {
    // Log audit failures but don't fail the main operation
    console.error('Failed to create audit log:', error);
  }
}

// JD Analysis specific audit actions
export const AUDIT_ACTIONS = {
  JOB_JD_ANALYZE_REQUESTED: 'JOB_JD_ANALYZE_REQUESTED',
  JOB_JD_ANALYZE_COMPLETED: 'JOB_JD_ANALYZE_COMPLETED',
  JOB_JD_ANALYZE_FAILED: 'JOB_JD_ANALYZE_FAILED',
} as const;
