/**
 * AI Configuration Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('AI Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  it('should parse valid configuration', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_MODEL_DEFAULT = 'gpt-4';
    process.env.OPENAI_TEMPERATURE_DEFAULT = '0.1';
    process.env.OPENAI_TIMEOUT_MS = '60000';
    process.env.OPENAI_MAX_RETRIES = '3';

    // Dynamic import to get fresh config
    const { getAiConfig } = await import('../config');
    const freshConfig = getAiConfig();

    expect(freshConfig.OPENAI_API_KEY).toBe('test-key');
    expect(freshConfig.OPENAI_MODEL_DEFAULT).toBe('gpt-4');
    expect(freshConfig.OPENAI_TEMPERATURE_DEFAULT).toBe(0.1);
    expect(freshConfig.OPENAI_TIMEOUT_MS).toBe(60000);
    expect(freshConfig.OPENAI_MAX_RETRIES).toBe(3);
  });

  it('should use defaults when optional values are missing', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    // Clear other env vars to test defaults

    // Dynamic import to get fresh config
    const { getAiConfig } = await import('../config');
    const freshConfig = getAiConfig();

    expect(freshConfig.OPENAI_API_KEY).toBe('test-key');
    expect(freshConfig.OPENAI_MODEL_DEFAULT).toBe('gpt-4o-mini');
    expect(freshConfig.OPENAI_TEMPERATURE_DEFAULT).toBe(0.2);
    expect(freshConfig.OPENAI_TIMEOUT_MS).toBe(30000);
    expect(freshConfig.OPENAI_MAX_RETRIES).toBe(2);
  });

  it('should throw error when API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const { getAiConfig } = await import('../config');
    
    await expect(async () => {
      getAiConfig();
    }).rejects.toThrow('Missing required environment variable: OPENAI_API_KEY');
  });

  it('should correctly identify when AI is configured', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const { isAiConfigured } = await import('../config');
    expect(isAiConfigured()).toBe(true);

    delete process.env.OPENAI_API_KEY;
    const { isAiConfigured: isAiConfigured2 } = await import('../config');
    expect(isAiConfigured2()).toBe(false);
  });

  it('should return configuration error message', async () => {
    delete process.env.OPENAI_API_KEY;
    
    const { getAiConfigurationError } = await import('../config');
    const error = getAiConfigurationError();
    expect(error).toContain('Missing required environment variable: OPENAI_API_KEY');
  });
});
