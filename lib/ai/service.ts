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
} from './types';
import { getProviderConfig, getAIConfig, isProviderConfigured, getConfigurationError } from './config';
import { createAIError, AIErrorCode, normalizeProviderError, AIError } from './errors';
import { aiLogger } from './logging';

// Provider registry - will be populated with actual providers
let providerInstance: LLMProvider | null = null;

/**
 * Initialize the AI service with the configured provider
 */
async function initializeProvider(config: ProviderConfig): Promise<LLMProvider> {
  // Check if provider is configured
  if (!isProviderConfigured()) {
    throw createAIError(
      AIErrorCode.PROVIDER_NOT_CONFIGURED,
      `Provider '${config.name}' is not configured`,
      { provider: config.name }
    );
  }
  
  // Import and initialize the appropriate provider
  switch (config.name) {
    case 'mock':
      const { MockProvider } = await import('./providers/mock');
      return new MockProvider(config);
      
    case 'openrouter':
      const { OpenRouterProvider } = await import('./providers/openrouter');
      return new OpenRouterProvider(config);
      
    case 'groq':
      const { GroqProvider } = await import('./providers/groq');
      return new GroqProvider(config);
      
    case 'openai':
      const { OpenAIProvider } = await import('./providers/openai');
      return new OpenAIProvider(config);
      
    default:
      throw createAIError(
        AIErrorCode.INVALID_PROVIDER,
        `Unknown provider: ${config.name}`,
        { provider: config.name }
      );
  }
}

/**
 * Get or create the provider instance
 */
async function getProvider(): Promise<LLMProvider> {
  if (!providerInstance) {
    const config = getProviderConfig();
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
  requestId?: string,
  orgId?: string
): Promise<T> {
  const startTime = Date.now();
  const config = getProviderConfig();
  
  // Log operation start
  aiLogger.logStart(operationName, config.name, requestId, orgId);
  
  try {
    // Check configuration first
    const configError = getConfigurationError();
    if (configError) {
      const error = createAIError(
        AIErrorCode.PROVIDER_NOT_CONFIGURED,
        configError,
        { requestId }
      );
      aiLogger.logError({ operation: operationName, provider: config.name, requestId, orgId }, error);
      throw error;
    }
    
    const provider = await getProvider();
    const result = await operation();
    
    // Log success
    const duration = Date.now() - startTime;
    aiLogger.logSuccess({
      operation: operationName,
      provider: config.name,
      model: config.model,
      requestId,
      orgId,
      duration,
      inputTokens: 0, // Will be populated by real providers
      outputTokens: 0, // Will be populated by real providers
      costEstimate: undefined, // Will be populated by real providers
      retries: 0, // Will be populated by real providers
    });
    
    return result;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // If it's already an AI error, log and re-throw it
    if (error && typeof error === 'object' && 'code' in error) {
      const aiError = error as AIError;
      aiLogger.logError({ 
        operation: operationName, 
        provider: config.name, 
        requestId, 
        orgId, 
        duration,
        retries: 0 // Will be populated by real providers
      }, aiError);
      throw error;
    }
    
    // Normalize provider errors
    const normalizedError = normalizeProviderError(error, config.name, requestId);
    aiLogger.logError({ 
      operation: operationName, 
      provider: config.name, 
      requestId, 
      orgId, 
      duration,
      retries: 0 // Will be populated by real providers
    }, normalizedError);
    
    throw normalizedError;
  }
}

function isStructuredAIError(e: unknown): e is AIError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    typeof (e as { code: unknown }).code === 'string'
  );
}

/**
 * Dev-only, opt-in: after rate limit / timeout / network errors, complete with the mock provider.
 * Off by default so an unlimited (or paid) LLM always returns real model output.
 */
function devMockFallbackForTransientLLMFailures(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  return (
    process.env.AI_DEV_MOCK_FALLBACK === '1' ||
    process.env.AI_DEV_MOCK_ON_RATE_LIMIT === '1'
  );
}

const TRANSIENT_LLM_MOCK_FALLBACK_CODES: AIErrorCode[] = [
  AIErrorCode.RATE_LIMITED,
  AIErrorCode.TIMEOUT,
  AIErrorCode.NETWORK_ERROR,
];

function isTransientLLMFailureForDevMock(error: unknown): boolean {
  return (
    isStructuredAIError(error) &&
    TRANSIENT_LLM_MOCK_FALLBACK_CODES.includes(error.code as AIErrorCode)
  );
}

async function createDevMockProvider(): Promise<import('./providers/mock').MockProvider> {
  const c = getAIConfig();
  const { MockProvider } = await import('./providers/mock');
  const mockConfig = {
    name: 'mock',
    model: 'mock',
    timeout: c.LLM_TIMEOUT_MS,
    maxRetries: c.LLM_MAX_RETRIES,
    scenario: c.MOCK_AI_SCENARIO,
    failureMode: 'none' as const,
    forceFailureRate: 0,
    simulateLatencyMs: 0,
  } as ProviderConfig & {
    scenario?: string;
    failureMode?: string;
    forceFailureRate?: number;
    simulateLatencyMs?: number;
  };
  return new MockProvider(mockConfig);
}

async function analyzeJDWithDevTransientFallback(
  input: AnalyzeJDInput
): Promise<AnalyzeJDResult> {
  try {
    return await executeAIOperation(
      async () => {
        const provider = await getProvider();
        return await provider.analyzeJD(input);
      },
      'analyzeJD',
      input.requestId,
      input.orgId
    );
  } catch (error) {
    if (devMockFallbackForTransientLLMFailures() && isTransientLLMFailureForDevMock(error)) {
      console.warn(
        '[aiService] Remote LLM transient failure — using mock JD analysis (dev only, AI_DEV_MOCK_FALLBACK=1).'
      );
      const mock = await createDevMockProvider();
      return mock.analyzeJD(input);
    }
    throw error;
  }
}

async function generateTargetedImprovementWithDevTransientFallback(
  input: TargetedImprovementInput
): Promise<TargetedImprovementResult> {
  try {
    return await executeAIOperation(
      async () => {
        const provider = await getProvider();
        return await provider.generateTargetedImprovement(input);
      },
      'generateTargetedImprovement',
      input.requestId,
      input.orgId
    );
  } catch (error) {
    if (devMockFallbackForTransientLLMFailures() && isTransientLLMFailureForDevMock(error)) {
      console.warn(
        '[aiService] Remote LLM transient failure — using mock targeted improvement (dev only).'
      );
      const mock = await createDevMockProvider();
      return mock.generateTargetedImprovement(input);
    }
    throw error;
  }
}

/**
 * AI Service - Main interface for all AI operations
 */
export const aiService = {
  /**
   * Analyze job description
   */
  async analyzeJD(input: AnalyzeJDInput): Promise<AnalyzeJDResult> {
    return analyzeJDWithDevTransientFallback(input);
  },

  /**
   * Generate interview kit
   */
  async generateInterviewKit(input: InterviewKitInput): Promise<InterviewKitResult> {
    return executeAIOperation(
      async () => {
        const provider = await getProvider();
        return await provider.generateInterviewKit(input);
      },
      'generateInterviewKit',
      input.requestId
    );
  },

  /**
   * Generate candidate signals
   */
  async generateCandidateSignals(input: CandidateSignalsInput): Promise<CandidateSignalsResult> {
    return executeAIOperation(
      async () => {
        const provider = await getProvider();
        return await provider.generateCandidateSignals(input);
      },
      'generateCandidateSignals',
      input.requestId
    );
  },

  /**
   * Generate targeted improvement for specific JD issue
   */
  async generateTargetedImprovement(
    input: TargetedImprovementInput
  ): Promise<TargetedImprovementResult> {
    return generateTargetedImprovementWithDevTransientFallback(input);
  },

  /**
   * Refine the full job description (structure, deduplication, readability; preserve meaning).
   */
  async refineJobDescription(input: RefineJDInput): Promise<RefineJDResult> {
    return executeAIOperation(
      async () => {
        const provider = await getProvider();
        return await provider.refineJobDescription(input);
      },
      'refineJobDescription',
      input.requestId,
      input.orgId
    );
  },

  /**
   * Get current provider information
   */
  getProviderInfo() {
    return {
      name: getProviderConfig().name,
      configured: isProviderConfigured(),
      error: getConfigurationError(),
    };
  },

  /**
   * Reset provider instance (useful for testing)
   */
  reset() {
    providerInstance = null;
  },
};

// Export types and utilities
export type { BaseAIResult };
export { createAIError, AIErrorCode } from './errors';
export { getProviderConfig, isProviderConfigured } from './config';
