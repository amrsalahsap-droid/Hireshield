import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import interviewKitData from '../../../testdata/ai/interview_kit_v1.valid.json';
import jdExtractionData from '../../../testdata/ai/jd_extraction_v1.valid.json';

// Mock the dependencies at module level
vi.mock('@/lib/prisma', () => ({
  prisma: {
    job: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/server/ai/call', () => ({
  callLLMAndParseJSON: vi.fn(),
}));

vi.mock('@/lib/server/auth', () => ({
  getCurrentUserOrThrow: vi.fn(() => ({ id: 'user-123' })),
}));

vi.mock('@/lib/audit', () => ({
  createAuditLog: vi.fn(),
  AUDIT_ACTIONS: {
    JOB_INTERVIEW_KIT_GENERATE_STARTED: 'JOB_INTERVIEW_KIT_GENERATE_STARTED',
    JOB_INTERVIEW_KIT_GENERATE_COMPLETED: 'JOB_INTERVIEW_KIT_GENERATE_COMPLETED',
    JOB_INTERVIEW_KIT_GENERATE_FAILED: 'JOB_INTERVIEW_KIT_GENERATE_FAILED',
    JOB_INTERVIEW_KIT_GENERATED: 'JOB_INTERVIEW_KIT_GENERATED',
  },
}));

vi.mock('@/lib/server/org-context', () => ({
  withOrgContext: (handler: any) => handler,
}));

describe('Interview Kit Generation Logic Tests', () => {
  let mockPrisma: any;
  let mockCallLLM: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import mocked modules
    const { prisma } = await import('@/lib/prisma');
    const { callLLMAndParseJSON } = await import('@/lib/server/ai/call');
    
    mockPrisma = vi.mocked(prisma);
    mockCallLLM = vi.mocked(callLLMAndParseJSON);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Core Logic Tests', () => {
    it('should validate JD extraction before generation', async () => {
      const mockJob = {
        id: 'job-123',
        title: 'Senior Software Engineer',
        rawJD: 'Test JD content',
        jdExtractionJson: jdExtractionData,
        orgId: 'org-123',
        interviewKitJson: null,
        interviewKitStatus: 'NOT_STARTED',
      };

      // Mock job lookup
      mockPrisma.job.findFirst.mockResolvedValue(mockJob);

      // Mock AI call
      mockCallLLM.mockResolvedValue({
        value: interviewKitData,
        meta: {
          model: 'gpt-4',
          latencyMs: 1500,
          inputTokens: 1000,
          outputTokens: 2000,
          costEstimate: 0.05,
          retries: 0,
        },
      });

      // Mock job update
      const updatedJob = {
        ...mockJob,
        interviewKitJson: interviewKitData,
        interviewKitStatus: 'DONE',
        interviewKitGeneratedAt: new Date(),
        interviewKitPromptVersion: '1.0',
      };

      mockPrisma.job.update
        .mockResolvedValueOnce({ ...mockJob, interviewKitStatus: 'RUNNING' })
        .mockResolvedValueOnce(updatedJob);

      // Test the core logic by importing and calling the route handler directly
      const { PUT } = await import('@/app/api/jobs/[id]/route');
      
      // Create a mock request with proper structure
      const mockRequest = {
        url: 'http://localhost/api/jobs/job-123/generate-interview-kit',
        method: 'PUT',
        headers: {
          'x-org-id': 'org-123',
        },
      } as any;

      // Create mock params object
      const mockParams = Promise.resolve({ id: 'job-123' });

      // Call the route handler
      const response = await PUT(mockRequest, { params: mockParams }, 'org-123');
      const data = await response.json();

      // Verify the response
      expect(response.status).toBe(200);
      expect(data.interviewKit).toEqual(interviewKitData);
      expect(data.requestId).toBeDefined();
      expect(data.cached).toBe(false);
      expect(data.job.id).toBe('job-123');
      expect(data.job.title).toBe('Senior Software Engineer');
      expect(data.meta).toBeDefined();

      // Verify AI was called
      expect(mockCallLLM).toHaveBeenCalledTimes(1);
      expect(mockCallLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          promptId: 'interview_kit_v1',
          schema: expect.any(Object),
          requestId: expect.any(String),
          orgId: 'org-123',
        })
      );

      // Verify job was updated
      expect(mockPrisma.job.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job-123' },
          data: expect.objectContaining({
            interviewKitJson: interviewKitData,
            interviewKitStatus: 'DONE',
          }),
        })
      );
    });

    it('should return cached result when kit exists', async () => {
      const mockJob = {
        id: 'job-123',
        title: 'Senior Software Engineer',
        rawJD: 'Test JD content',
        jdExtractionJson: jdExtractionData,
        orgId: 'org-123',
        interviewKitJson: interviewKitData, // Kit already exists
        interviewKitStatus: 'DONE',
        interviewKitGeneratedAt: new Date(),
        interviewKitPromptVersion: '1.0',
      };

      // Mock job lookup
      mockPrisma.job.findFirst.mockResolvedValue(mockJob);

      // Test the core logic
      const { PUT } = await import('@/app/api/jobs/[id]/route');
      
      const mockRequest = {
        url: 'http://localhost/api/jobs/job-123/generate-interview-kit',
        method: 'PUT',
        headers: {
          'x-org-id': 'org-123',
        },
      } as any;

      const mockParams = Promise.resolve({ id: 'job-123' });

      const response = await PUT(mockRequest, { params: mockParams }, 'org-123');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.interviewKit).toEqual(interviewKitData);
      expect(data.cached).toBe(true);
      expect(data.requestId).toBeNull();

      // Verify AI was NOT called
      expect(mockCallLLM).not.toHaveBeenCalled();
    });

    it('should force regenerate when force parameter is provided', async () => {
      const mockJob = {
        id: 'job-123',
        title: 'Senior Software Engineer',
        rawJD: 'Test JD content',
        jdExtractionJson: jdExtractionData,
        orgId: 'org-123',
        interviewKitJson: interviewKitData, // Kit already exists
        interviewKitStatus: 'DONE',
        interviewKitGeneratedAt: new Date(),
        interviewKitPromptVersion: '1.0',
      };

      // Mock job lookup
      mockPrisma.job.findFirst.mockResolvedValue(mockJob);

      // Mock AI call for regeneration
      const newKitData = { ...interviewKitData, roleTitle: 'Updated Role' };
      mockCallLLM.mockResolvedValue({
        value: newKitData,
        meta: {
          model: 'gpt-4',
          latencyMs: 1500,
          inputTokens: 1000,
          outputTokens: 2000,
          costEstimate: 0.05,
          retries: 0,
        },
      });

      // Mock job update
      const updatedJob = {
        ...mockJob,
        interviewKitJson: newKitData,
        interviewKitStatus: 'DONE',
        interviewKitGeneratedAt: new Date(),
        interviewKitPromptVersion: '1.0',
      };

      mockPrisma.job.update
        .mockResolvedValueOnce({ ...mockJob, interviewKitStatus: 'RUNNING' })
        .mockResolvedValueOnce(updatedJob);

      // Test the core logic
      const { PUT } = await import('@/app/api/jobs/[id]/route');
      
      const mockRequest = {
        url: 'http://localhost/api/jobs/job-123/generate-interview-kit?force=1',
        method: 'PUT',
        headers: {
          'x-org-id': 'org-123',
        },
      } as any;

      const mockParams = Promise.resolve({ id: 'job-123' });

      const response = await PUT(mockRequest, { params: mockParams }, 'org-123');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.interviewKit).toEqual(newKitData);
      expect(data.cached).toBe(false);
      expect(data.requestId).toBeDefined();

      // Verify AI was called for regeneration
      expect(mockCallLLM).toHaveBeenCalledTimes(1);
    });

    it('should handle missing JD extraction', async () => {
      const mockJob = {
        id: 'job-123',
        title: 'Test Job',
        rawJD: 'Test JD',
        jdExtractionJson: null, // Missing JD extraction
        orgId: 'org-123',
      };

      // Mock job lookup
      mockPrisma.job.findFirst.mockResolvedValue(mockJob);

      // Test the core logic
      const { PUT } = await import('@/app/api/jobs/[id]/route');
      
      const mockRequest = {
        url: 'http://localhost/api/jobs/job-123/generate-interview-kit',
        method: 'PUT',
        headers: {
          'x-org-id': 'org-123',
        },
      } as any;

      const mockParams = Promise.resolve({ id: 'job-123' });

      const response = await PUT(mockRequest, { params: mockParams }, 'org-123');
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Analyze JD first');
      expect(data.message).toBe('Job description must be analyzed before generating interview kit');

      // Verify AI was NOT called
      expect(mockCallLLM).not.toHaveBeenCalled();
    });

    it('should handle job not found', async () => {
      // Mock job not found
      mockPrisma.job.findFirst.mockResolvedValue(null);

      // Test the core logic
      const { PUT } = await import('@/app/api/jobs/[id]/route');
      
      const mockRequest = {
        url: 'http://localhost/api/jobs/job-123/generate-interview-kit',
        method: 'PUT',
        headers: {
          'x-org-id': 'org-123',
        },
      } as any;

      const mockParams = Promise.resolve({ id: 'job-123' });

      const response = await PUT(mockRequest, { params: mockParams }, 'org-123');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Job not found');

      // Verify AI was NOT called
      expect(mockCallLLM).not.toHaveBeenCalled();
    });

    it('should handle AI call failure', async () => {
      const mockJob = {
        id: 'job-123',
        title: 'Senior Software Engineer',
        rawJD: 'Test JD content',
        jdExtractionJson: jdExtractionData,
        orgId: 'org-123',
        interviewKitJson: null,
        interviewKitStatus: 'NOT_STARTED',
      };

      // Mock job lookup
      mockPrisma.job.findFirst.mockResolvedValue(mockJob);

      // Mock AI call failure
      mockCallLLM.mockRejectedValue(new Error('AI service unavailable'));

      // Mock job update for failure
      mockPrisma.job.update
        .mockResolvedValueOnce({ ...mockJob, interviewKitStatus: 'RUNNING' })
        .mockResolvedValueOnce({
          ...mockJob,
          interviewKitStatus: 'FAILED',
          interviewKitLastError: 'AI service unavailable',
        });

      // Test the core logic
      const { PUT } = await import('@/app/api/jobs/[id]/route');
      
      const mockRequest = {
        url: 'http://localhost/api/jobs/job-123/generate-interview-kit',
        method: 'PUT',
        headers: {
          'x-org-id': 'org-123',
        },
      } as any;

      const mockParams = Promise.resolve({ id: 'job-123' });

      const response = await PUT(mockRequest, { params: mockParams }, 'org-123');
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate interview kit');
      expect(data.requestId).toBeDefined();

      // Verify job status was updated to FAILED
      expect(mockPrisma.job.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job-123' },
          data: expect.objectContaining({
            interviewKitStatus: 'FAILED',
            interviewKitLastError: 'AI service unavailable',
          }),
        })
      );
    });
  });
});
