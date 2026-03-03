/**
 * LLM Call Wrapper Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import {
  callLLMAndParseJSON,
  LLMErrorCode,
  LLMCallError,
  LLMCallMeta,
  CallLLMAndParseJSONArgs,
} from '../call';

// Mock OpenAI module
vi.mock('openai', () => ({
  default: vi.fn(),
}));

// Mock dependencies
vi.mock('../client', () => ({
  getOpenAIClient: vi.fn(),
}));

vi.mock('../config', () => ({
  getOpenAiModelDefault: () => 'gpt-4o-mini',
  getOpenAiTemperatureDefault: () => 0.2,
  getOpenAiMaxRetries: () => 2,
  getOpenAiTimeoutMs: () => 30000,
}));

import OpenAI from 'openai';
import { getOpenAIClient } from '../client';

describe('callLLMAndParseJSON', () => {
  let mockOpenAI: any;
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenAI = vi.mocked(OpenAI);
    mockClient = {
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    };
    vi.mocked(getOpenAIClient).mockReturnValue(mockClient);
  });

  const createMockResponse = (content: string, usage?: any) => ({
    choices: [
      {
        message: { content },
      },
    ],
    usage: usage || {
      prompt_tokens: 10,
      completion_tokens: 20,
    },
  });

  const testSchema = z.object({
    name: z.string(),
    age: z.number(),
    active: z.boolean(),
  });

  type TestType = z.infer<typeof testSchema>;

  it('should successfully parse valid JSON response', async () => {
    const validResponse = JSON.stringify({
      name: 'John Doe',
      age: 30,
      active: true,
    });

    mockClient.chat.completions.create.mockResolvedValue(
      createMockResponse(validResponse)
    );

    const result = await callLLMAndParseJSON<TestType>({
      system: 'You are a helpful assistant.',
      user: 'Create a user profile',
      schema: testSchema,
    });

    expect(result.value).toEqual({
      name: 'John Doe',
      age: 30,
      active: true,
    });

    expect(result.meta).toMatchObject({
      model: 'gpt-4o-mini',
      inputTokens: 10,
      outputTokens: 20,
      latencyMs: expect.any(Number),
      retries: 0,
    });

    expect(result.meta.costEstimate).toBeGreaterThan(0);
  });

  it('should retry on JSON parse error and succeed', async () => {
    // First call returns invalid JSON
    mockClient.chat.completions.create
      .mockResolvedValueOnce(createMockResponse('invalid json'))
      .mockResolvedValueOnce(
        createMockResponse(JSON.stringify({
          name: 'Jane Doe',
          age: 25,
          active: false,
        }))
      );

    const result = await callLLMAndParseJSON<TestType>({
      system: 'You are a helpful assistant.',
      user: 'Create a user profile',
      schema: testSchema,
    });

    expect(result.value).toEqual({
      name: 'Jane Doe',
      age: 25,
      active: false,
    });

    expect(result.meta.retries).toBe(1);
    expect(mockClient.chat.completions.create).toHaveBeenCalledTimes(2);
  });

  it('should retry on schema validation error and succeed', async () => {
    // First call returns valid JSON but wrong schema
    const invalidSchemaResponse = JSON.stringify({
      name: 'John Doe',
      age: 'thirty', // Should be number
      // missing 'active' field
    });

    mockClient.chat.completions.create
      .mockResolvedValueOnce(createMockResponse(invalidSchemaResponse))
      .mockResolvedValueOnce(
        createMockResponse(JSON.stringify({
          name: 'John Doe',
          age: 30,
          active: true,
        }))
      );

    const result = await callLLMAndParseJSON<TestType>({
      system: 'You are a helpful assistant.',
      user: 'Create a user profile',
      schema: testSchema,
    });

    expect(result.value).toEqual({
      name: 'John Doe',
      age: 30,
      active: true,
    });

    expect(result.meta.retries).toBe(1);
  });

  it('should fail after max retries with structured error', async () => {
    const invalidResponse = JSON.stringify({
      name: 'John Doe',
      age: 'thirty', // Invalid type
    });

    mockClient.chat.completions.create.mockResolvedValue(
      createMockResponse(invalidResponse)
    );

    try {
      await callLLMAndParseJSON<TestType>({
        system: 'You are a helpful assistant.',
        user: 'Create a user profile',
        schema: testSchema,
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      const llmError = error as LLMCallError;
      expect(llmError.code).toBe(LLMErrorCode.OUTPUT_INVALID);
      expect(llmError.validationErrors).toBeDefined();
      expect(llmError.retryCount).toBe(2);
      expect(llmError.rawOutput).toBeDefined();
    }
  });

  it('should handle network errors with retries', async () => {
    mockClient.chat.completions.create
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockResolvedValueOnce(
        createMockResponse(JSON.stringify({
          name: 'John Doe',
          age: 30,
          active: true,
        }))
      );

    const result = await callLLMAndParseJSON<TestType>({
      system: 'You are a helpful assistant.',
      user: 'Create a user profile',
      schema: testSchema,
    });

    expect(result.value).toEqual({
      name: 'John Doe',
      age: 30,
      active: true,
    });

    expect(result.meta.retries).toBe(1);
  });

  it('should use custom parameters', async () => {
    const validResponse = JSON.stringify({
      name: 'John Doe',
      age: 30,
      active: true,
    });

    mockClient.chat.completions.create.mockResolvedValue(
      createMockResponse(validResponse)
    );

    await callLLMAndParseJSON<TestType>({
      system: 'You are a helpful assistant.',
      user: 'Create a user profile',
      schema: testSchema,
      model: 'gpt-4',
      temperature: 0.5,
      maxOutputTokens: 100,
      requestId: 'test-request-123',
      orgId: 'test-org-456',
    });

    expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4',
        temperature: 0.5,
        max_tokens: 100,
        user: 'test-request-123',
        response_format: { type: 'json_object' },
      })
    );
  });

  it('should extract JSON from mixed content', async () => {
    const mixedContent = `Here's the user profile you requested:

${JSON.stringify({
  name: 'John Doe',
  age: 30,
  active: true,
})}

Let me know if you need anything else!`;

    mockClient.chat.completions.create.mockResolvedValue(
      createMockResponse(mixedContent)
    );

    const result = await callLLMAndParseJSON<TestType>({
      system: 'You are a helpful assistant.',
      user: 'Create a user profile',
      schema: testSchema,
    });

    expect(result.value).toEqual({
      name: 'John Doe',
      age: 30,
      active: true,
    });
  });

  it('should handle array responses', async () => {
    const arraySchema = z.array(testSchema);
    const arrayResponse = JSON.stringify([
      { name: 'John', age: 30, active: true },
      { name: 'Jane', age: 25, active: false },
    ]);

    mockClient.chat.completions.create.mockResolvedValue(
      createMockResponse(arrayResponse)
    );

    const result = await callLLMAndParseJSON({
      system: 'You are a helpful assistant.',
      user: 'Create user profiles',
      schema: arraySchema,
    });

    expect(result.value).toEqual([
      { name: 'John', age: 30, active: true },
      { name: 'Jane', age: 25, active: false },
    ]);
  });

  it('should truncate raw output in error messages', async () => {
    const longInvalidResponse = 'x'.repeat(1000);
    mockClient.chat.completions.create.mockResolvedValue(
      createMockResponse(longInvalidResponse)
    );

    try {
      await callLLMAndParseJSON<TestType>({
        system: 'You are a helpful assistant.',
        user: 'Create a user profile',
        schema: testSchema,
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      const llmError = error as LLMCallError;
      expect(llmError.rawOutput?.length).toBeLessThanOrEqual(500);
    }
  });

  it('should handle empty response', async () => {
    mockClient.chat.completions.create.mockResolvedValue(
      createMockResponse('')
    );

    try {
      await callLLMAndParseJSON<TestType>({
        system: 'You are a helpful assistant.',
        user: 'Create a user profile',
        schema: testSchema,
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      const llmError = error as LLMCallError;
      expect(llmError.code).toBe(LLMErrorCode.OUTPUT_INVALID);
    }
  });

  it('should calculate cost estimates correctly', async () => {
    const validResponse = JSON.stringify({
      name: 'John Doe',
      age: 30,
      active: true,
    });

    mockClient.chat.completions.create.mockResolvedValue(
      createMockResponse(validResponse, {
        prompt_tokens: 1000,
        completion_tokens: 500,
      })
    );

    const result = await callLLMAndParseJSON<TestType>({
      system: 'You are a helpful assistant.',
      user: 'Create a user profile',
      schema: testSchema,
    });

    expect(result.meta.costEstimate).toBeGreaterThan(0);
    expect(result.meta.inputTokens).toBe(1000);
    expect(result.meta.outputTokens).toBe(500);
  });
});
