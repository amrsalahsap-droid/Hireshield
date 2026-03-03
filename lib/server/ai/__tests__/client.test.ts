/**
 * OpenAI Client Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock OpenAI module before importing client
vi.mock('openai', () => ({
  default: vi.fn(),
}));

import { 
  getOpenAIClient, 
  resetOpenAIClient, 
  isOpenAIClientInitialized, 
  getOpenAIClientConfig 
} from '../client';
import OpenAI from 'openai';

describe('OpenAI Client Singleton', () => {
  const originalEnv = process.env;
  let mockOpenAIConstructor: any;

  beforeEach(() => {
    // Reset environment and singleton before each test
    vi.resetModules();
    process.env = { ...originalEnv };
    resetOpenAIClient();
    vi.clearAllMocks();
    
    // Get the mock constructor
    mockOpenAIConstructor = vi.mocked(OpenAI);
  });

  it('should create OpenAI client with valid configuration', async () => {
    process.env.OPENAI_API_KEY = 'test-api-key';
    process.env.OPENAI_TIMEOUT_MS = '60000';

    // Mock the constructor to return a simple object
    mockOpenAIConstructor.mockImplementation(function(config: any) {
      return {
        apiKey: config.apiKey,
        timeout: config.timeout,
        maxRetries: config.maxRetries,
      };
    });

    // Import client functions
    const { getOpenAIClient, isOpenAIClientInitialized } = await import('../client');
    const client = getOpenAIClient();

    expect(client).toBeDefined();
    expect(isOpenAIClientInitialized()).toBe(true);
    expect(mockOpenAIConstructor).toHaveBeenCalledWith({
      apiKey: 'test-api-key',
      timeout: 60000,
      maxRetries: 2,
    });
  });

  it('should return same instance on multiple calls', async () => {
    process.env.OPENAI_API_KEY = 'test-api-key';

    mockOpenAIConstructor.mockImplementation(function(config: any) {
      return {
        apiKey: config.apiKey,
        timeout: config.timeout,
        maxRetries: config.maxRetries,
      };
    });

    const { getOpenAIClient, isOpenAIClientInitialized } = await import('../client');
    const client1 = getOpenAIClient();
    const client2 = getOpenAIClient();

    expect(client1).toBe(client2);
    expect(isOpenAIClientInitialized()).toBe(true);
    expect(mockOpenAIConstructor).toHaveBeenCalledTimes(1);
  });

  it('should throw error when API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const { getOpenAIClient } = await import('../client');

    expect(() => {
      getOpenAIClient();
    }).toThrow('Missing required environment variable: OPENAI_API_KEY');
  });

  it('should use default timeout when not specified', async () => {
    process.env.OPENAI_API_KEY = 'test-api-key';
    // Clear timeout to test default

    mockOpenAIConstructor.mockImplementation(function(config: any) {
      return {
        apiKey: config.apiKey,
        timeout: config.timeout,
        maxRetries: config.maxRetries,
      };
    });

    const { getOpenAIClient } = await import('../client');
    const client = getOpenAIClient();

    expect(client).toBeDefined();
    expect(mockOpenAIConstructor).toHaveBeenCalledWith({
      apiKey: 'test-api-key',
      timeout: 30000,
      maxRetries: 2,
    });
  });

  it('should reset client properly', async () => {
    process.env.OPENAI_API_KEY = 'test-api-key';

    mockOpenAIConstructor.mockImplementation(function(config: any) {
      return {
        apiKey: config.apiKey,
        timeout: config.timeout,
        maxRetries: config.maxRetries,
      };
    });

    const { getOpenAIClient, resetOpenAIClient, isOpenAIClientInitialized } = 
      await import('../client');

    // Create client
    getOpenAIClient();
    expect(isOpenAIClientInitialized()).toBe(true);

    // Reset client
    resetOpenAIClient();
    expect(isOpenAIClientInitialized()).toBe(false);

    // Should be able to create new client
    const newClient = getOpenAIClient();
    expect(newClient).toBeDefined();
    expect(isOpenAIClientInitialized()).toBe(true);
  });

  it('should return client configuration without exposing API key', async () => {
    process.env.OPENAI_API_KEY = 'test-api-key';
    process.env.OPENAI_TIMEOUT_MS = '60000';

    const { getOpenAIClientConfig } = await import('../client');
    const config = getOpenAIClientConfig();

    expect(config).toEqual({
      timeout: 60000,
      maxRetries: 2,
      isConfigured: true,
    });
    expect(config).not.toHaveProperty('apiKey');
  });

  it('should show not configured when API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const { getOpenAIClientConfig } = await import('../client');
    
    // This should not throw an error since getOpenAIClientConfig doesn't call getAiConfig
    const config = getOpenAIClientConfig();

    expect(config.isConfigured).toBe(false);
  });

  it('should create client with custom configuration', async () => {
    process.env.OPENAI_API_KEY = 'test-api-key';
    process.env.OPENAI_TIMEOUT_MS = '45000';

    mockOpenAIConstructor.mockImplementation(function(config: any) {
      return {
        apiKey: config.apiKey,
        timeout: config.timeout,
        maxRetries: config.maxRetries,
      };
    });

    const { getOpenAIClient } = await import('../client');
    
    getOpenAIClient();

    // Verify OpenAI constructor was called with correct config
    expect(mockOpenAIConstructor).toHaveBeenCalledWith({
      apiKey: 'test-api-key',
      timeout: 45000,
      maxRetries: 2,
    });
  });
});
