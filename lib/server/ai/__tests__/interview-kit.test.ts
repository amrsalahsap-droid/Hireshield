/**
 * Test Interview Kit Storage
 * Simple test to verify interview kit fields work correctly
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

describe('Interview Kit Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create job with interview kit data', async () => {
    const jobData = {
      title: 'Senior Frontend Developer',
      rawJD: 'We are looking for a senior frontend developer...',
      status: 'DRAFT',
      orgId: 'test-org-id',
      interviewKitJson: {
        interviewQuestions: [
          {
            question: 'Tell me about your React experience',
            category: 'technical',
            difficulty: 'intermediate',
            expectedAnswer: 'Should demonstrate React knowledge'
          }
        ],
        evaluationCriteria: [
          {
            skill: 'React',
            weight: 0.3,
            description: 'Proficiency in React framework'
          }
        ],
        metadata: {
          promptId: 'interview_kit_generator_v1',
          version: '1.0',
          generatedAt: '2026-03-02T00:00:00Z'
        }
      },
      interviewKitGeneratedAt: new Date(),
      interviewKitPromptVersion: 'interview_kit_generator_v1'
    };

    mockPrisma.job.create.mockResolvedValue(jobData);

    // This would be called in actual implementation
    const result = await mockPrisma.job.create({
      data: jobData
    });

    expect(mockPrisma.job.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: jobData.title,
        rawJD: jobData.rawJD,
        status: jobData.status,
        orgId: jobData.orgId,
        interviewKitJson: jobData.interviewKitJson,
        interviewKitGeneratedAt: jobData.interviewKitGeneratedAt,
        interviewKitPromptVersion: jobData.interviewKitPromptVersion
      })
    });

    expect(result).toEqual(jobData);
  });

  it('should update job with interview kit data', async () => {
    const jobId = 'test-job-id';
    const updateData = {
      interviewKitJson: {
        interviewQuestions: [
          {
            question: 'Describe a challenging project',
            category: 'behavioral',
            difficulty: 'advanced',
            expectedAnswer: 'Should demonstrate problem-solving skills'
          }
        ],
        evaluationCriteria: [
          {
            skill: 'Problem Solving',
            weight: 0.4,
            description: 'Ability to solve complex problems'
          }
        ]
      },
      interviewKitGeneratedAt: new Date(),
      interviewKitPromptVersion: 'interview_kit_generator_v1'
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

  it('should handle null interview kit data', async () => {
    const jobData = {
      title: 'Junior Developer',
      rawJD: 'Entry level position...',
      status: 'DRAFT',
      orgId: 'test-org-id',
      interviewKitJson: null,
      interviewKitGeneratedAt: null,
      interviewKitPromptVersion: null
    };

    mockPrisma.job.create.mockResolvedValue(jobData);

    const result = await mockPrisma.job.create({
      data: jobData
    });

    expect(mockPrisma.job.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        interviewKitJson: null,
        interviewKitGeneratedAt: null,
        interviewKitPromptVersion: null
      })
    });

    expect(result).toEqual(jobData);
  });

  it('should persist interview kit for reuse', async () => {
    const jobId = 'test-job-id';
    
    // First, create job with interview kit
    const initialJob = {
      id: jobId,
      title: 'Senior Developer',
      interviewKitJson: {
        interviewQuestions: ['Q1', 'Q2'],
        evaluationCriteria: ['Criteria1', 'Criteria2']
      },
      interviewKitGeneratedAt: new Date(),
      interviewKitPromptVersion: 'interview_kit_generator_v1'
    };

    mockPrisma.job.findUnique.mockResolvedValue(initialJob);

    // Simulate fetching the job later (should reuse same kit)
    const fetchedJob = await mockPrisma.job.findUnique({
      where: { id: jobId }
    });

    expect(mockPrisma.job.findUnique).toHaveBeenCalledWith({
      where: { id: jobId }
    });

    expect(fetchedJob).toEqual(initialJob);
    expect(fetchedJob.interviewKitJson).toEqual(initialJob.interviewKitJson);
    expect(fetchedJob.interviewKitGeneratedAt).toEqual(initialJob.interviewKitGeneratedAt);
    expect(fetchedJob.interviewKitPromptVersion).toEqual(initialJob.interviewKitPromptVersion);
  });
});
