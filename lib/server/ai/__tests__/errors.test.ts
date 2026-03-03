/**
 * AI Error Types Tests
 */

import { describe, it, expect } from 'vitest';
import {
  AIConfigError,
  AIParseError,
  AISchemaError,
  AIRateLimitError,
  AITimeoutError,
  AIInputValidationError,
  AIUnknownError,
  fromLLMCallError,
  isAIError,
  AI_ERROR_CODES,
} from '../errors';
import { LLMErrorCode, LLMCallError } from '../call';

describe('AI Error Types', () => {
  describe('Error Classes', () => {
    it('should create AIConfigError with correct properties', () => {
      const error = new AIConfigError('Configuration missing', 'req-123');
      
      expect(error.code).toBe('AI_CONFIG_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Configuration missing');
      expect(error.requestId).toBe('req-123');
      expect(isAIError(error)).toBe(true);
    });

    it('should create AIParseError with correct properties', () => {
      const error = new AIParseError('Invalid JSON', 'req-123', '{"invalid": json}');
      
      expect(error.code).toBe('AI_PARSE_ERROR');
      expect(error.statusCode).toBe(502);
      expect(error.message).toBe('Invalid JSON');
      expect(error.requestId).toBe('req-123');
      expect(error.details?.rawOutputLength).toBe(17);
    });

    it('should create AISchemaError with correct properties', () => {
      const validationErrors = ['field1: required', 'field2: invalid type'];
      const error = new AISchemaError('Schema validation failed', 'req-123', validationErrors);
      
      expect(error.code).toBe('AI_SCHEMA_ERROR');
      expect(error.statusCode).toBe(502);
      expect(error.message).toBe('Schema validation failed');
      expect(error.requestId).toBe('req-123');
      expect(error.details?.validationErrors).toEqual(validationErrors);
    });

    it('should create AIRateLimitError with correct properties', () => {
      const error = new AIRateLimitError('Rate limit exceeded', 'req-123', 60);
      
      expect(error.code).toBe('AI_RATE_LIMIT_ERROR');
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.requestId).toBe('req-123');
      expect(error.details?.retryAfter).toBe(60);
    });

    it('should create AITimeoutError with correct properties', () => {
      const error = new AITimeoutError('Request timeout', 'req-123', 30000);
      
      expect(error.code).toBe('AI_TIMEOUT_ERROR');
      expect(error.statusCode).toBe(504);
      expect(error.message).toBe('Request timeout');
      expect(error.requestId).toBe('req-123');
      expect(error.details?.timeout).toBe(30000);
    });

    it('should create AIInputValidationError with correct properties', () => {
      const error = new AIInputValidationError('Invalid input', 'req-123', 'email');
      
      expect(error.code).toBe('AI_INPUT_VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
      expect(error.requestId).toBe('req-123');
      expect(error.details?.field).toBe('email');
    });

    it('should create AIUnknownError with correct properties', () => {
      const error = new AIUnknownError('Unknown error', 'req-123', 'Original error details');
      
      expect(error.code).toBe('AI_UNKNOWN_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Unknown error');
      expect(error.requestId).toBe('req-123');
      expect(error.details?.originalError).toBe('Original error details');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize errors to correct format', () => {
      const error = new AISchemaError('Validation failed', 'req-123', ['field1: required']);
      const serialized = error.toJSON();
      
      expect(serialized).toEqual({
        error: {
          code: 'AI_SCHEMA_ERROR',
          message: 'Validation failed',
          requestId: 'req-123',
          details: {
            validationErrors: ['field1: required']
          }
        }
      });
    });

    it('should serialize errors without optional properties', () => {
      const error = new AIConfigError('Config error');
      const serialized = error.toJSON();
      
      expect(serialized).toEqual({
        error: {
          code: 'AI_CONFIG_ERROR',
          message: 'Config error'
        }
      });
    });
  });

  describe('fromLLMCallError', () => {
    it('should convert CONFIGURATION_ERROR to AIConfigError', () => {
      const llmError: LLMCallError = {
        name: 'Error',
        message: 'API key missing',
        code: LLMErrorCode.CONFIGURATION_ERROR,
      } as LLMCallError;

      const aiError = fromLLMCallError(llmError, 'req-123');
      
      expect(aiError).toBeInstanceOf(AIConfigError);
      expect(aiError.code).toBe('AI_CONFIG_ERROR');
      expect(aiError.requestId).toBe('req-123');
    });

    it('should convert OUTPUT_INVALID with validation errors to AISchemaError', () => {
      const llmError: LLMCallError = {
        name: 'Error',
        message: 'Validation failed',
        code: LLMErrorCode.OUTPUT_INVALID,
        validationErrors: ['field1: required', 'field2: invalid'],
      } as LLMCallError;

      const aiError = fromLLMCallError(llmError, 'req-123');
      
      expect(aiError).toBeInstanceOf(AISchemaError);
      expect(aiError.code).toBe('AI_SCHEMA_ERROR');
      expect(aiError.requestId).toBe('req-123');
    });

    it('should convert OUTPUT_INVALID without validation errors to AIParseError', () => {
      const llmError: LLMCallError = {
        name: 'Error',
        message: 'Invalid JSON',
        code: LLMErrorCode.OUTPUT_INVALID,
        rawOutput: '{"invalid": json}',
      } as LLMCallError;

      const aiError = fromLLMCallError(llmError, 'req-123');
      
      expect(aiError).toBeInstanceOf(AIParseError);
      expect(aiError.code).toBe('AI_PARSE_ERROR');
      expect(aiError.requestId).toBe('req-123');
    });

    it('should convert NETWORK_ERROR to AIUnknownError', () => {
      const llmError: LLMCallError = {
        name: 'Error',
        message: 'Network connection failed',
        code: LLMErrorCode.NETWORK_ERROR,
      } as LLMCallError;

      const aiError = fromLLMCallError(llmError, 'req-123');
      
      expect(aiError).toBeInstanceOf(AIUnknownError);
      expect(aiError.code).toBe('AI_UNKNOWN_ERROR');
      expect(aiError.requestId).toBe('req-123');
    });

    it('should convert unknown error to AIUnknownError', () => {
      const llmError: LLMCallError = {
        name: 'Error',
        message: 'Some unknown error',
        code: LLMErrorCode.UNKNOWN_ERROR,
      } as LLMCallError;

      const aiError = fromLLMCallError(llmError, 'req-123');
      
      expect(aiError).toBeInstanceOf(AIUnknownError);
      expect(aiError.code).toBe('AI_UNKNOWN_ERROR');
      expect(aiError.requestId).toBe('req-123');
    });
  });

  describe('Constants', () => {
    it('should export all error codes', () => {
      expect(AI_ERROR_CODES).toEqual({
        AI_CONFIG_ERROR: 'AI_CONFIG_ERROR',
        AI_PARSE_ERROR: 'AI_PARSE_ERROR',
        AI_SCHEMA_ERROR: 'AI_SCHEMA_ERROR',
        AI_RATE_LIMIT_ERROR: 'AI_RATE_LIMIT_ERROR',
        AI_TIMEOUT_ERROR: 'AI_TIMEOUT_ERROR',
        AI_INPUT_VALIDATION_ERROR: 'AI_INPUT_VALIDATION_ERROR',
        AI_UNKNOWN_ERROR: 'AI_UNKNOWN_ERROR',
      });
    });
  });
});
