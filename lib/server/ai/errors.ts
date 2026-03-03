/**
 * AI Error Types
 * Standardized error types for AI operations
 * 
 * IMPORTANT: This module must only be imported from server-side code.
 * Do NOT import from any files that use "use client" directive.
 */

import { LLMErrorCode, LLMCallError } from './call';

// Base AI Error class
export abstract class AIError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  readonly requestId?: string;
  readonly details?: Record<string, any>;

  constructor(message: string, requestId?: string, details?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.requestId = requestId;
    this.details = details;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        requestId: this.requestId,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

// AI Configuration Error
export class AIConfigError extends AIError {
  readonly code = 'AI_CONFIG_ERROR';
  readonly statusCode = 500;

  constructor(message: string, requestId?: string) {
    super(message, requestId);
  }
}

// AI Parse Error (JSON parsing failed)
export class AIParseError extends AIError {
  readonly code = 'AI_PARSE_ERROR';
  readonly statusCode = 502;

  constructor(message: string, requestId?: string, rawOutput?: string) {
    super(message, requestId, { 
      ...(rawOutput && { rawOutputLength: rawOutput.length })
    });
  }
}

// AI Schema Error (validation failed)
export class AISchemaError extends AIError {
  readonly code = 'AI_SCHEMA_ERROR';
  readonly statusCode = 502;

  constructor(message: string, requestId?: string, validationErrors?: string[]) {
    super(message, requestId, { 
      ...(validationErrors && { validationErrors })
    });
  }
}

// AI Rate Limit Error
export class AIRateLimitError extends AIError {
  readonly code = 'AI_RATE_LIMIT_ERROR';
  readonly statusCode = 429;

  constructor(message: string = 'AI service rate limit exceeded', requestId?: string, retryAfter?: number) {
    super(message, requestId, { 
      ...(retryAfter && { retryAfter })
    });
  }
}

// AI Timeout Error
export class AITimeoutError extends AIError {
  readonly code = 'AI_TIMEOUT_ERROR';
  readonly statusCode = 504;

  constructor(message: string = 'AI service timeout', requestId?: string, timeout?: number) {
    super(message, requestId, { 
      ...(timeout && { timeout })
    });
  }
}

// AI Input Validation Error
export class AIInputValidationError extends AIError {
  readonly code = 'AI_INPUT_VALIDATION_ERROR';
  readonly statusCode = 400;

  constructor(message: string, requestId?: string, field?: string) {
    super(message, requestId, { 
      ...(field && { field })
    });
  }
}

// AI Unknown Error
export class AIUnknownError extends AIError {
  readonly code = 'AI_UNKNOWN_ERROR';
  readonly statusCode = 500;

  constructor(message: string = 'An unknown error occurred', requestId?: string, originalError?: string) {
    super(message, requestId, { 
      ...(originalError && { originalError })
    });
  }
}

// Error type mapping from LLM call errors
export function fromLLMCallError(error: LLMCallError, requestId?: string): AIError {
  switch (error.code) {
    case LLMErrorCode.CONFIGURATION_ERROR:
      return new AIConfigError(error.message, requestId);
    
    case LLMErrorCode.OUTPUT_INVALID:
      if (error.validationErrors && error.validationErrors.length > 0) {
        return new AISchemaError(
          'AI output validation failed',
          requestId,
          error.validationErrors
        );
      } else {
        return new AIParseError(
          'AI output could not be parsed as valid JSON',
          requestId,
          error.rawOutput
        );
      }
    
    case LLMErrorCode.NETWORK_ERROR:
      return new AIUnknownError(
        'Network error communicating with AI service',
        requestId,
        error.message
      );
    
    case LLMErrorCode.TIMEOUT_ERROR:
      return new AITimeoutError(error.message, requestId);
    
    case LLMErrorCode.RATE_LIMIT_ERROR:
      return new AIRateLimitError(error.message, requestId);
    
    default:
      return new AIUnknownError(error.message, requestId, error.message);
  }
}

// Error type guard
export function isAIError(error: any): error is AIError {
  return error instanceof AIError;
}

// Get all error codes for validation
export const AI_ERROR_CODES = {
  AI_CONFIG_ERROR: 'AI_CONFIG_ERROR',
  AI_PARSE_ERROR: 'AI_PARSE_ERROR',
  AI_SCHEMA_ERROR: 'AI_SCHEMA_ERROR',
  AI_RATE_LIMIT_ERROR: 'AI_RATE_LIMIT_ERROR',
  AI_TIMEOUT_ERROR: 'AI_TIMEOUT_ERROR',
  AI_INPUT_VALIDATION_ERROR: 'AI_INPUT_VALIDATION_ERROR',
  AI_UNKNOWN_ERROR: 'AI_UNKNOWN_ERROR',
} as const;

export type AIErrorCode = typeof AI_ERROR_CODES[keyof typeof AI_ERROR_CODES];
