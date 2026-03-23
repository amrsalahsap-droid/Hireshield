/**
 * AI Service
 * Centralized AI service that manages providers and handles all AI operations
 */

import { 
  LLMProvider, 
  AnalyzeJDInput, 
  AnalyzeJDResult, 
  InterviewKitInput, 
  InterviewKitResult,
  CandidateSignalsInput,
  CandidateSignalsResult,
  BaseAIResult,
  ProviderConfig,
  TargetedImprovementInput,
  TargetedImprovementResult,
  RefineJDInput,
  RefineJDResult,
  FallbackMeta,
  BaseAIInput,
} from './types';
import { getProviderConfig, isProviderConfigured, getConfigurationError } from './config';
import { createAIError, AIErrorCode, normalizeProviderError, AIError } from './errors';
import { aiLogger } from './logging';
import { isRateLimitLikeError } from './error-classification';
import { getFallbackProviderConfig } from './fallback-config';
import {
  localAnalyzeJD,
  localGenerateTargetedImprovement,
  localRefineJobDescription,
} from './local-fallbacks';

// Provider registry - will be populated with actual providers
let providerInstance: LLMProvider | null = null;

/**
 * Initialize the AI service with the configured provider
 */
async function initializeProvider(config: ProviderConfig): Promise<LLMProvider> {
  switch (config.name) {
    case 'mock': {
      const { MockProvider } = await import('./providers/mock');
      return new MockProvider(config);
    }
    case 'openrouter': {
      const { OpenRouterProvider } = await import('./providers/openrouter');
      return new OpenRouterProvider(config);
    }
    case 'groq': {
      const { GroqProvider } = await import('./providers/groq');
      return new GroqProvider(config);
    }
    case 'openai': {
      const { OpenAIProvider } = await import('./providers/openai');
      return new OpenAIProvider(config);
    }
    default:
      throw createAIError(
        AIErrorCode.INVALID_PROVIDER,
        `Unknown provider: ${config.name}`,
        { provider: config.name }
      );
  }
}

/**
 * Get or create the primary provider instance (cached singleton).
 */
async function getProvider(): Promise<LLMProvider> {
  if (!providerInstance) {
    const config = getProviderConfig();
    if (!isProviderConfigured()) {
      throw createAIError(
        AIErrorCode.PROVIDER_NOT_CONFIGURED,
        `Provider '${config.name}' is not configured`,
        { provider: config.name }
      );
    }
    providerInstance = await initializeProvider(config);
  }
  return providerInstance;
}

/**
 * Execute AI operation with error handling and logging
 */
async function executeAIOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  providerName: string,
  requestId?: string,
  orgId?: string
): Promise<T> {
  const startTime = Date.now();

  aiLogger.logStart(operationName, providerName, requestId, orgId);

  try {
    const result = await operation();

    const duration = Date.now() - startTime;
    aiLogger.logSuccess({
      timestamp: new Date().toISOString(),
      operation: operationName,
      provider: providerName,
      requestId,
      orgId,
      duration,
      inputTokens: 0,
      outputTokens: 0,
      costEstimate: undefined,
      retries: 0,
    });

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    const logCtx = {
      timestamp: new Date().toISOString(),
      operation: operationName,
      provider: providerName,
      requestId,
      orgId,
      duration,
      retries: 0,
    };

    if (error && typeof error === 'object' && 'code' in error) {
      aiLogger.logError(logCtx, error as AIError);
      throw error;
    }

    const normalizedError = normalizeProviderError(error, providerName, requestId);
    aiLogger.logError(logCtx, normalizedError);

    throw normalizedError;
  }
}

// ---------------------------------------------------------------------------
// withFallback — central cascade: primary → fallback provider → local
// ---------------------------------------------------------------------------

async function withFallback<TInput extends BaseAIInput, TResult>(
  input: TInput,
  operationName: string,
  primaryFn: (provider: LLMProvider) => Promise<TResult>,
  localFallbackFn?: (input: TInput) => TResult,
): Promise<TResult & Partial<FallbackMeta>> {
  const primaryConfig = getProviderConfig();

  // --- 1. Primary provider ---
  try {
    const configError = getConfigurationError();
    if (configError) {
      throw createAIError(AIErrorCode.PROVIDER_NOT_CONFIGURED, configError, {
        requestId: input.requestId,
      });
    }

    const provider = await getProvider();
    const result = await executeAIOperation(
      () => primaryFn(provider),
      operationName,
      primaryConfig.name,
      input.requestId,
      input.orgId,
    );

    return {
      ...result,
      fallbackUsed: false,
      fallbackType: null,
      providerUsed: primaryConfig.name,
    };
  } catch (primaryError) {
    if (!isRateLimitLikeError(primaryError)) throw primaryError;

    console.warn(
      `[aiService] ${operationName}: primary provider '${primaryConfig.name}' hit rate-limit-like error, attempting fallback.`,
    );

    // --- 2. Fallback provider ---
    const fallbackConfig = getFallbackProviderConfig();
    if (fallbackConfig) {
      try {
        const fallbackProvider = await initializeProvider(fallbackConfig);
        const result = await executeAIOperation(
          () => primaryFn(fallbackProvider),
          operationName,
          fallbackConfig.name,
          input.requestId,
          input.orgId,
        );

        console.info(
          `[aiService] ${operationName}: succeeded via fallback provider '${fallbackConfig.name}'.`,
        );

        return {
          ...result,
          fallbackUsed: true,
          fallbackType: 'provider',
          providerUsed: fallbackConfig.name,
        };
      } catch (fallbackError) {
        console.warn(
          `[aiService] ${operationName}: fallback provider '${fallbackConfig.name}' also failed.`,
        );
      }
    }

    // --- 3. Local fallback ---
    if (localFallbackFn) {
      console.info(
        `[aiService] ${operationName}: using local heuristic fallback.`,
      );

      const result = localFallbackFn(input);
      return {
        ...result,
        fallbackUsed: true,
        fallbackType: 'local',
        providerUsed: 'local',
      };
    }

    // No fallback available — re-throw original error
    throw primaryError;
  }
}

/**
 * AI Service - Main interface for all AI operations
 */
export const aiService = {
  async analyzeJD(input: AnalyzeJDInput): Promise<AnalyzeJDResult & Partial<FallbackMeta>> {
    return withFallback(
      input,
      'analyzeJD',
      (p) => p.analyzeJD(input),
      localAnalyzeJD,
    );
  },

  async generateInterviewKit(input: InterviewKitInput): Promise<InterviewKitResult> {
    return executeAIOperation(
      async () => {
        const provider = await getProvider();
        return await provider.generateInterviewKit(input);
      },
      'generateInterviewKit',
      getProviderConfig().name,
      input.requestId,
    );
  },

  async generateCandidateSignals(input: CandidateSignalsInput): Promise<CandidateSignalsResult> {
    return executeAIOperation(
      async () => {
        const provider = await getProvider();
        return await provider.generateCandidateSignals(input);
      },
      'generateCandidateSignals',
      getProviderConfig().name,
      input.requestId,
    );
  },

  async generateTargetedImprovement(
    input: TargetedImprovementInput,
  ): Promise<TargetedImprovementResult & Partial<FallbackMeta>> {
    return withFallback(
      input,
      'generateTargetedImprovement',
      (p) => p.generateTargetedImprovement(input),
      localGenerateTargetedImprovement,
    );
  },

  async refineJobDescription(
    input: RefineJDInput,
  ): Promise<RefineJDResult & Partial<FallbackMeta>> {
    return withFallback(
      input,
      'refineJobDescription',
      (p) => p.refineJobDescription(input),
      localRefineJobDescription,
    );
  },

  getProviderInfo() {
    return {
      name: getProviderConfig().name,
      configured: isProviderConfigured(),
      error: getConfigurationError(),
    };
  },

  reset() {
    providerInstance = null;
  },
};

// Export types and utilities
export type { BaseAIResult };
export { createAIError, AIErrorCode } from './errors';
export { getProviderConfig, isProviderConfigured } from './config';
