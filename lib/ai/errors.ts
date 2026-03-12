/**
 * AI Error Types
 * Structured error handling for AI operations
 */

// Error codes for AI operations
export enum AIErrorCode {
  // Configuration errors
  PROVIDER_NOT_CONFIGURED = 'AI_PROVIDER_NOT_CONFIGURED',
  INVALID_PROVIDER = 'AI_INVALID_PROVIDER',
  
  // Network/timeout errors
  TIMEOUT = 'AI_TIMEOUT',
  NETWORK_ERROR = 'AI_NETWORK_ERROR',
  RATE_LIMITED = 'AI_RATE_LIMITED',
  
  // Output validation errors
  OUTPUT_INVALID = 'AI_OUTPUT_INVALID',
  OUTPUT_TOO_LARGE = 'AI_OUTPUT_TOO_LARGE',
  SCHEMA_VALIDATION_FAILED = 'AI_SCHEMA_VALIDATION_FAILED',
  
  // Provider-specific errors
  PROVIDER_ERROR = 'AI_PROVIDER_ERROR',
  QUOTA_EXCEEDED = 'AI_QUOTA_EXCEEDED',
  MODEL_NOT_AVAILABLE = 'AI_MODEL_NOT_AVAILABLE',
  
  // General errors
  UNKNOWN_ERROR = 'AI_UNKNOWN_ERROR',
  INPUT_VALIDATION_FAILED = 'AI_INPUT_VALIDATION_FAILED',
}

// Structured error interface
export interface AIError extends Error {
  code: AIErrorCode;
  provider?: string;
  model?: string;
  requestId?: string;
  details?: any;
  retryable: boolean;
  userMessage: string;
}

// Create structured AI error
export function createAIError(
  code: AIErrorCode,
  message: string,
  options: {
    provider?: string;
    model?: string;
    requestId?: string;
    details?: any;
    retryable?: boolean;
    userMessage?: string;
  } = {}
): AIError {
  const error = new Error(message) as AIError;
  error.code = code;
  error.provider = options.provider;
  error.model = options.model;
  error.requestId = options.requestId;
  error.details = options.details;
  error.retryable = options.retryable ?? false;
  error.userMessage = options.userMessage ?? getDefaultUserMessage(code);
  return error;
}

// Default user-friendly error messages
function getDefaultUserMessage(code: AIErrorCode): string {
  switch (code) {
    case AIErrorCode.PROVIDER_NOT_CONFIGURED:
      return 'AI service is not configured. Please contact your administrator.';
      
    case AIErrorCode.TIMEOUT:
      return 'The AI service is taking too long to respond. Please try again.';
      
    case AIErrorCode.RATE_LIMITED:
      return 'Too many requests to the AI service. Please wait a moment and try again.';
      
    case AIErrorCode.OUTPUT_INVALID:
      return 'The AI service returned an unexpected response. Please try again.';
      
    case AIErrorCode.QUOTA_EXCEEDED:
      return 'AI service quota has been exceeded. Please contact your administrator.';
      
    case AIErrorCode.MODEL_NOT_AVAILABLE:
      return 'The requested AI model is currently unavailable. Please try again later.';
      
    case AIErrorCode.NETWORK_ERROR:
      return 'Unable to connect to the AI service. Please check your connection and try again.';
      
    default:
      return 'An unexpected error occurred with the AI service. Please try again.';
  }
}

// Check if error is retryable
export function isRetryableError(error: AIError): boolean {
  return error.retryable || [
    AIErrorCode.TIMEOUT,
    AIErrorCode.NETWORK_ERROR,
    AIErrorCode.RATE_LIMITED,
  ].includes(error.code);
}

// Check if error is configuration-related
export function isConfigurationError(error: AIError): boolean {
  return [
    AIErrorCode.PROVIDER_NOT_CONFIGURED,
    AIErrorCode.INVALID_PROVIDER,
  ].includes(error.code);
}

// Convert provider-specific errors to AI errors
export function normalizeProviderError(
  error: any,
  provider: string,
  requestId?: string
): AIError {
  // Handle common error patterns
  if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
    return createAIError(
      AIErrorCode.NETWORK_ERROR,
      `Network error: ${error.message}`,
      { provider, requestId, retryable: true }
    );
  }
  
  if (error?.message?.includes('timeout')) {
    return createAIError(
      AIErrorCode.TIMEOUT,
      `Request timeout: ${error.message}`,
      { provider, requestId, retryable: true }
    );
  }
  
  if (error?.message?.includes('rate limit') || error?.code === 'rate_limit_exceeded') {
    return createAIError(
      AIErrorCode.RATE_LIMITED,
      `Rate limit exceeded: ${error.message}`,
      { provider, requestId, retryable: true }
    );
  }
  
  // Handle OpenAI-specific errors
  if (provider === 'openai') {
    if (error?.code === 'insufficient_quota') {
      return createAIError(
        AIErrorCode.QUOTA_EXCEEDED,
        'OpenAI quota exceeded',
        { provider, requestId }
      );
    }
    
    if (error?.code === 'model_not_found') {
      return createAIError(
        AIErrorCode.MODEL_NOT_AVAILABLE,
        `OpenAI model not available: ${error.message}`,
        { provider, requestId }
      );
    }
  }
  
  // Default to unknown error
  return createAIError(
    AIErrorCode.UNKNOWN_ERROR,
    error?.message || 'Unknown provider error',
    { provider, requestId, details: error }
  );
}

