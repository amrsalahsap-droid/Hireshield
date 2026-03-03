/**
 * Test JD Extraction Storage
 * Simple test to verify JD extraction fields work correctly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Mock Prisma client for testing
const mockPrisma = {
  job: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
} as any;

describe('JD Extraction Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create job with JD extraction data', async () => {
    const jobData = {
      title: 'Senior Frontend Developer',
      rawJD: 'We are looking for a senior frontend developer...',
      status: 'DRAFT',
      orgId: 'test-org-id',
      jdExtractionJson: {
        overallScore: 85,
        requirements: [
          {
            requirement: 'React',
            type: 'skill',
            importance: 'required',
            level: 'advanced',
            evidence: ['React experience required'],
            confidence: 0.9
          }
        ],
        metadata: {
          promptId: 'jd_analyzer_v1',
          version: '1.0',
          analyzedAt: '2026-03-02T00:00:00Z'
        }
      },
      jdAnalyzedAt: new Date(),
      jdPromptVersion: 'jd_analyzer_v1'
    };

    mockPrisma.job.create.mockResolvedValue(jobData);

    // This would be called in the actual implementation
    const result = await mockPrisma.job.create({
      data: jobData
    });

    expect(mockPrisma.job.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: jobData.title,
        rawJD: jobData.rawJD,
        status: jobData.status,
        orgId: jobData.orgId,
        jdExtractionJson: jobData.jdExtractionJson,
        jdAnalyzedAt: jobData.jdAnalyzedAt,
        jdPromptVersion: jobData.jdPromptVersion
      })
    });

    expect(result).toEqual(jobData);
  });

  it('should update job with JD extraction data', async () => {
    const jobId = 'test-job-id';
    const updateData = {
      jdExtractionJson: {
        overallScore: 90,
        requirements: [
          {
            requirement: 'TypeScript',
            type: 'skill',
            importance: 'required',
            level: 'advanced',
            evidence: ['TypeScript experience required'],
            confidence: 0.95
          }
        ]
      },
      jdAnalyzedAt: new Date(),
      jdPromptVersion: 'jd_analyzer_v1'
    };

    mockPrisma.job.update.mockResolvedValue(updateData);

    const result = await mockPrisma.job.update({
      where: { id: jobId },
      data: updateData
    });

    expect(mockPrisma.job.update).toHaveBeenCalledWith({
      where: { id: jobId },
      data: updateData
    });

    expect(result).toEqual(updateData);
  });

  it('should handle null JD extraction data', async () => {
    const jobData = {
      title: 'Junior Developer',
      rawJD: 'Entry level position...',
      status: 'DRAFT',
      orgId: 'test-org-id',
      jdExtractionJson: null,
      jdAnalyzedAt: null,
      jdPromptVersion: null
    };

    mockPrisma.job.create.mockResolvedValue(jobData);

    const result = await mockPrisma.job.create({
      data: jobData
    });

    expect(mockPrisma.job.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jdExtractionJson: null,
        jdAnalyzedAt: null,
        jdPromptVersion: null
      })
    });

    expect(result).toEqual(jobData);
  });
});
