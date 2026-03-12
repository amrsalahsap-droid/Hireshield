/**
 * AI Configuration
 * Centralized configuration for AI providers and settings
 */

import { z } from 'zod';

// Environment variable schema
const aiConfigSchema = z.object({
  // Provider selection
  LLM_PROVIDER: z.enum(['mock', 'openrouter', 'groq', 'openai']).default('mock'),
  
  // Mock provider settings
  MOCK_AI_SCENARIO: z.enum(['frontend', 'backend', 'sales', 'generic']).optional(),
  MOCK_AI_FAILURE_MODE: z.enum(['none', 'timeout', 'invalid_output', 'rate_limit']).default('none'),
  
  // OpenRouter settings
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('openrouter/free'),
  OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
  
  // Groq settings
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama3-8b-8192'),
  
  // OpenAI settings (legacy)
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL_DEFAULT: z.string().default('gpt-4o-mini'),
  OPENAI_TEMPERATURE_DEFAULT: z.number().default(0.2),
  
  // Development testing controls
  LLM_TIMEOUT_MS: z.number().default(30000),
  LLM_MAX_RETRIES: z.number().default(2),
  LLM_FORCE_FAILURE_RATE: z.number().min(0).max(1).default(0), // 0-1, 0.1 = 10%
  LLM_SIMULATE_LATENCY_MS: z.number().default(0), // Add artificial latency for testing
  LLM_DEBUG_REQUESTS: z.boolean().default(false), // Log full request/response for debugging
});

// Parse and validate environment variables
function parseConfig() {
  const rawConfig = aiConfigSchema.parse({
    LLM_PROVIDER: process.env.LLM_PROVIDER,
    MOCK_AI_SCENARIO: process.env.MOCK_AI_SCENARIO,
    MOCK_AI_FAILURE_MODE: process.env.MOCK_AI_FAILURE_MODE,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
    OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GROQ_MODEL: process.env.GROQ_MODEL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL_DEFAULT: process.env.OPENAI_MODEL_DEFAULT,
    OPENAI_TEMPERATURE_DEFAULT: process.env.OPENAI_TEMPERATURE_DEFAULT
      ? parseFloat(process.env.OPENAI_TEMPERATURE_DEFAULT)
      : undefined,
    LLM_TIMEOUT_MS: process.env.LLM_TIMEOUT_MS
      ? parseInt(process.env.LLM_TIMEOUT_MS, 10)
      : undefined,
    LLM_MAX_RETRIES: process.env.LLM_MAX_RETRIES
      ? parseInt(process.env.LLM_MAX_RETRIES, 10)
      : undefined,
  });

  return rawConfig;
}

// Lazy-loaded configuration cache
let _config: ReturnType<typeof parseConfig> | null = null;

export function getAIConfig() {
  if (!_config) {
    _config = parseConfig();
  }
  return _config;
}

// Provider-specific configuration getters
export function getProviderConfig() {
  const config = getAIConfig();
  
  switch (config.LLM_PROVIDER) {
    case 'mock':
      return {
        name: 'mock',
        model: 'mock',
        timeout: config.LLM_TIMEOUT_MS,
        maxRetries: config.LLM_MAX_RETRIES,
        scenario: config.MOCK_AI_SCENARIO,
        failureMode: config.MOCK_AI_FAILURE_MODE,
        forceFailureRate: config.LLM_FORCE_FAILURE_RATE || 0,
        simulateLatencyMs: config.LLM_SIMULATE_LATENCY_MS || 0,
      };
      
    case 'openrouter':
      return {
        name: 'openrouter',
        apiKey: config.OPENROUTER_API_KEY,
        baseUrl: config.OPENROUTER_BASE_URL,
        model: config.OPENROUTER_MODEL,
        timeout: config.LLM_TIMEOUT_MS,
        maxRetries: config.LLM_MAX_RETRIES,
        forceFailureRate: config.LLM_FORCE_FAILURE_RATE || 0,
        simulateLatencyMs: config.LLM_SIMULATE_LATENCY_MS || 0,
      };
      
    case 'groq':
      return {
        name: 'groq',
        apiKey: config.GROQ_API_KEY,
        model: config.GROQ_MODEL,
        timeout: config.LLM_TIMEOUT_MS,
        maxRetries: config.LLM_MAX_RETRIES,
        forceFailureRate: config.LLM_FORCE_FAILURE_RATE || 0,
        simulateLatencyMs: config.LLM_SIMULATE_LATENCY_MS || 0,
      };
      
    case 'openai':
      return {
        name: 'openai',
        apiKey: config.OPENAI_API_KEY,
        model: config.OPENAI_MODEL_DEFAULT,
        timeout: config.LLM_TIMEOUT_MS,
        maxRetries: config.LLM_MAX_RETRIES,
        temperature: config.OPENAI_TEMPERATURE_DEFAULT,
        forceFailureRate: config.LLM_FORCE_FAILURE_RATE || 0,
        simulateLatencyMs: config.LLM_SIMULATE_LATENCY_MS || 0,
      };
      
    default:
      throw new Error(`Unknown provider: ${config.LLM_PROVIDER}`);
  }
}

// Helper functions
export function isMockMode(): boolean {
  return getAIConfig().LLM_PROVIDER === 'mock';
}

export function getProviderName(): string {
  return getAIConfig().LLM_PROVIDER;
}

export function isProviderConfigured(): boolean {
  const config = getProviderConfig();
  return config.name === 'mock' || !!config.apiKey;
}

export function getConfigurationError(): string | null {
  try {
    const config = getProviderConfig();
    if (config.name !== 'mock' && !config.apiKey) {
      return `API key required for provider: ${config.name}`;
    }
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Configuration error';
  }
}

// Development testing controls
export function getDevTestingControls() {
  const config = getAIConfig();
  return {
    forceFailureRate: config.LLM_FORCE_FAILURE_RATE || 0,
    simulateLatencyMs: config.LLM_SIMULATE_LATENCY_MS || 0,
    debugRequests: config.LLM_DEBUG_REQUESTS || false,
    timeoutMs: config.LLM_TIMEOUT_MS || 30000,
    maxRetries: config.LLM_MAX_RETRIES || 2,
  };
}
