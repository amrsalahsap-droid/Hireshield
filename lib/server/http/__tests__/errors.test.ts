/**
 * HTTP Error Response Mapping Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  toHttpError,
  getRequestId,
  withErrorHandling,
  createValidationError,
  createRateLimitError,
} from '../errors';
import {
  AIConfigError,
  AIParseError,
  AISchemaError,
  AIRateLimitError,
  AITimeoutError,
  AIInputValidationError,
} from '../../ai/errors';

describe('HTTP Error Response Mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('toHttpError', () => {
    it('should convert AIError to HTTP response', () => {
      const aiError = new AISchemaError('Validation failed', 'req-123', ['field1: required']);
      const response = toHttpError(aiError);
      
      expect(response.status).toBe(502);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('X-Request-ID')).toBe('req-123');
      
      const json = response.json();
      expect(json).toEqual({
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

    it('should convert standard Error with timeout to AITimeoutError', () => {
      const error = new Error('Request timeout occurred');
      const response = toHttpError(error, 'req-456');
      
      expect(response.status).toBe(504);
      expect(response.headers.get('X-Request-ID')).toBe('req-456');
      
      const json = response.json();
      expect(json.error.code).toBe('AI_TIMEOUT_ERROR');
    });

    it('should convert standard Error with rate limit to AIRateLimitError', () => {
      const error = new Error('RATE_LIMIT exceeded');
      const response = toHttpError(error, 'req-789');
      
      expect(response.status).toBe(429);
      expect(response.headers.get('X-Request-ID')).toBe('req-789');
      
      const json = response.json();
      expect(json.error.code).toBe('AI_RATE_LIMIT_ERROR');
    });

    it('should convert unknown Error to AIUnknownError', () => {
      const error = new Error('Something went wrong');
      const response = toHttpError(error, 'req-999');
      
      expect(response.status).toBe(500);
      expect(response.headers.get('X-Request-ID')).toBe('req-999');
      
      const json = response.json();
      expect(json.error.code).toBe('AI_UNKNOWN_ERROR');
      expect(json.error.details.originalError).toBe('Something went wrong');
    });

    it('should convert unknown error type to AIUnknownError', () => {
      const error = 'string error';
      const response = toHttpError(error, 'req-000');
      
      expect(response.status).toBe(500);
      expect(response.headers.get('X-Request-ID')).toBe('req-000');
      
      const json = response.json();
      expect(json.error.code).toBe('AI_UNKNOWN_ERROR');
    });
  });

  describe('getRequestId', () => {
    it('should extract request ID from headers', () => {
      const mockRequest = {
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'x-request-id') return 'existing-123';
            return null;
          }),
        },
      } as unknown as NextRequest;

      const requestId = getRequestId(mockRequest);
      expect(requestId).toBe('existing-123');
    });

    it('should generate new request ID when not in headers', () => {
      const mockRequest = {
        headers: {
          get: vi.fn(() => null),
        },
      } as unknown as NextRequest;

      const requestId = getRequestId(mockRequest);
      expect(requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should generate request ID when no request provided', () => {
      const requestId = getRequestId();
      expect(requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });
  });

  describe('withErrorHandling', () => {
    it('should wrap successful handler with request ID', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        new Response('success', { status: 200 })
      );
      
      const wrappedHandler = withErrorHandling(mockHandler);
      const mockRequest = {} as NextRequest;
      
      const response = await wrappedHandler(mockRequest);
      
      expect(mockHandler).toHaveBeenCalledWith(mockRequest);
      expect(response.headers.get('X-Request-ID')).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should handle errors and convert to HTTP response', async () => {
      const mockHandler = vi.fn().mockRejectedValue(
        new Error('Test error')
      );
      
      const wrappedHandler = withErrorHandling(mockHandler);
      const mockRequest = {} as NextRequest;
      
      const response = await wrappedHandler(mockRequest);
      
      expect(response.status).toBe(500);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('X-Request-ID')).toMatch(/^req_\d+_[a-z0-9]+$/);
      
      const json = response.json();
      expect(json.error.code).toBe('AI_UNKNOWN_ERROR');
    });
  });

  describe('createValidationError', () => {
    it('should create validation error response', () => {
      const response = createValidationError('Invalid email format', 'email', 'req-123');
      
      expect(response.status).toBe(400);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('X-Request-ID')).toBe('req-123');
      
      const json = response.json();
      expect(json).toEqual({
        error: {
          code: 'AI_INPUT_VALIDATION_ERROR',
          message: 'Invalid email format',
          requestId: 'req-123',
          details: {
            field: 'email'
          }
        }
      });
    });

    it('should create validation error without field', () => {
      const response = createValidationError('Invalid input', undefined, 'req-456');
      
      const json = response.json();
      expect(json.error.details).not.toHaveProperty('field');
    });
  });

  describe('createRateLimitError', () => {
    it('should create rate limit error response with retry-after', () => {
      const response = createRateLimitError('Too many requests', 60, 'req-123');
      
      expect(response.status).toBe(429);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('X-Request-ID')).toBe('req-123');
      expect(response.headers.get('Retry-After')).toBe('60');
      
      const json = response.json();
      expect(json).toEqual({
        error: {
          code: 'AI_RATE_LIMIT_ERROR',
          message: 'Too many requests',
          requestId: 'req-123',
          details: {
            retryAfter: 60
          }
        }
      });
    });

    it('should create rate limit error without retry-after', () => {
      const response = createRateLimitError('Rate limit exceeded', undefined, 'req-789');
      
      expect(response.headers.get('Retry-After')).toBeNull();
      
      const json = response.json();
      expect(json.error.details).not.toHaveProperty('retryAfter');
    });
  });
});
