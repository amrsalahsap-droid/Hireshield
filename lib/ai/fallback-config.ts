import type { ProviderConfig } from './types';
import { getAIConfig } from './config';

/**
 * Returns a ProviderConfig for the fallback provider, or null if none is
 * configured or usable (e.g. missing API key).
 */
export function getFallbackProviderConfig(): ProviderConfig | null {
  const config = getAIConfig();
  const fallback = config.LLM_FALLBACK_PROVIDER;

  if (!fallback || fallback === config.LLM_PROVIDER) return null;

  switch (fallback) {
    case 'mock':
      return {
        name: 'mock',
        model: 'mock',
        timeout: config.LLM_TIMEOUT_MS,
        maxRetries: config.LLM_MAX_RETRIES,
      };

    case 'openrouter': {
      const key = config.OPENROUTER_API_KEY;
      if (!key) return null;
      return {
        name: 'openrouter',
        apiKey: key,
        baseUrl: config.OPENROUTER_BASE_URL,
        model: config.OPENROUTER_MODEL,
        timeout: config.LLM_TIMEOUT_MS,
        maxRetries: config.LLM_MAX_RETRIES,
      };
    }

    case 'groq': {
      const key = config.GROQ_API_KEY;
      if (!key) return null;
      return {
        name: 'groq',
        apiKey: key,
        model: config.GROQ_MODEL,
        timeout: config.LLM_TIMEOUT_MS,
        maxRetries: config.LLM_MAX_RETRIES,
      };
    }

    case 'openai': {
      const key = config.OPENAI_API_KEY;
      if (!key) return null;
      return {
        name: 'openai',
        apiKey: key,
        model: config.OPENAI_MODEL_DEFAULT,
        timeout: config.LLM_TIMEOUT_MS,
        maxRetries: config.LLM_MAX_RETRIES,
        temperature: config.OPENAI_TEMPERATURE_DEFAULT,
      };
    }

    default:
      return null;
  }
}
