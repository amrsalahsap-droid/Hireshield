/**
 * AI Configuration Module
 * Server-only configuration for OpenAI and AI-related settings
 */

import { z } from 'zod';

// Environment variable schema for AI configuration
const aiConfigSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL_DEFAULT: z.string().default('gpt-4o-mini'),
  OPENAI_TEMPERATURE_DEFAULT: z.number().default(0.2),
  OPENAI_TIMEOUT_MS: z.number().default(30000),
  OPENAI_MAX_RETRIES: z.number().default(2),
});

// Parse and validate environment variables
function parseAiConfig() {
  const rawConfig = aiConfigSchema.parse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL_DEFAULT: process.env.OPENAI_MODEL_DEFAULT,
    OPENAI_TEMPERATURE_DEFAULT: process.env.OPENAI_TEMPERATURE_DEFAULT
      ? parseFloat(process.env.OPENAI_TEMPERATURE_DEFAULT)
      : undefined,
    OPENAI_TIMEOUT_MS: process.env.OPENAI_TIMEOUT_MS
      ? parseInt(process.env.OPENAI_TIMEOUT_MS, 10)
      : undefined,
    OPENAI_MAX_RETRIES: process.env.OPENAI_MAX_RETRIES
      ? parseInt(process.env.OPENAI_MAX_RETRIES, 10)
      : undefined,
  });

  // Custom validation for required API key
  if (!rawConfig.OPENAI_API_KEY) {
    throw new Error(
      'Missing required environment variable: OPENAI_API_KEY. ' +
      'Please set it in your .env file or environment variables.'
    );
  }

  return rawConfig;
}

// Lazy-loaded configuration cache
let _aiConfig: ReturnType<typeof parseAiConfig> | null = null;

// Export validated configuration (lazy-loaded)
export function getAiConfig() {
  if (!_aiConfig) {
    _aiConfig = parseAiConfig();
  }
  return _aiConfig;
}

// Export individual configuration values for convenience (lazy-loaded)
export function getOpenAiApiKey() {
  return getAiConfig().OPENAI_API_KEY;
}

export function getOpenAiModelDefault() {
  return getAiConfig().OPENAI_MODEL_DEFAULT;
}

export function getOpenAiTemperatureDefault() {
  return getAiConfig().OPENAI_TEMPERATURE_DEFAULT;
}

export function getOpenAiTimeoutMs() {
  return getAiConfig().OPENAI_TIMEOUT_MS;
}

export function getOpenAiMaxRetries() {
  return getAiConfig().OPENAI_MAX_RETRIES;
}

// Helper function to check if AI is properly configured
export function isAiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

// Helper function to get configuration error message
export function getAiConfigurationError(): string | null {
  try {
    const rawConfig = aiConfigSchema.parse({
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      OPENAI_MODEL_DEFAULT: process.env.OPENAI_MODEL_DEFAULT,
      OPENAI_TEMPERATURE_DEFAULT: process.env.OPENAI_TEMPERATURE_DEFAULT
        ? parseFloat(process.env.OPENAI_TEMPERATURE_DEFAULT)
        : undefined,
      OPENAI_TIMEOUT_MS: process.env.OPENAI_TIMEOUT_MS
        ? parseInt(process.env.OPENAI_TIMEOUT_MS, 10)
        : undefined,
      OPENAI_MAX_RETRIES: process.env.OPENAI_MAX_RETRIES
        ? parseInt(process.env.OPENAI_MAX_RETRIES, 10)
        : undefined,
    });

    // Custom validation for required API key
    if (!rawConfig.OPENAI_API_KEY) {
      return 'Missing required environment variable: OPENAI_API_KEY. Please set it in your .env file or environment variables.';
    }

    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Unknown AI configuration error';
  }
}
