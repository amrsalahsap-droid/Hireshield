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
  ProviderConfig
} from './types';
import { getProviderConfig, isProviderConfigured, getConfigurationError } from './config';
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

/**
 * AI Service - Main interface for all AI operations
 */
export const aiService = {
  /**
   * Analyze job description
   */
  async analyzeJD(input: AnalyzeJDInput): Promise<AnalyzeJDResult> {
    return executeAIOperation(
      async () => {
        const provider = await getProvider();
        return await provider.analyzeJD(input);
      },
      'analyzeJD',
      input.requestId,
      input.orgId
    );
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
