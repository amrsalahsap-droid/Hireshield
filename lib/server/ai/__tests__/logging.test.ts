/**
 * AI Logging Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createRequestId,
  configureAILogging,
  getAILogConfig,
  logAICallStart,
  logAICallComplete,
  logAICallError,
  logAICallRetry,
  logAIValidationError,
  logAIParseError,
  logAIEvent,
  extractCallData,
  LogLevel,
  AICallLogData,
} from '../logging';

describe('AI Logging', () => {
  beforeEach(() => {
    // Reset logging configuration before each test
    configureAILogging({
      enableConsoleLogging: true,
      enableFileLogging: false,
      logLevel: LogLevel.DEBUG,
      truncateRawOutput: 500,
    });
    
    // Mock console methods and clear all calls
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    
    // Clear all mock calls
    vi.clearAllMocks();
  });

  describe('createRequestId', () => {
    it('should generate a valid UUID', () => {
      const requestId = createRequestId();
      
      expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique IDs', () => {
      const id1 = createRequestId();
      const id2 = createRequestId();
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('configureAILogging and getAILogConfig', () => {
    it('should update logging configuration', () => {
      configureAILogging({
        enableConsoleLogging: false,
        logLevel: LogLevel.ERROR,
      });

      const config = getAILogConfig();
      
      expect(config.enableConsoleLogging).toBe(false);
      expect(config.enableFileLogging).toBe(false);
      expect(config.logLevel).toBe(LogLevel.ERROR);
      expect(config.truncateRawOutput).toBe(500);
    });

    it('should merge with existing configuration', () => {
      configureAILogging({
        truncateRawOutput: 1000,
      });

      const config = getAILogConfig();
      
      expect(config.enableConsoleLogging).toBe(true);
      expect(config.enableFileLogging).toBe(false);
      expect(config.logLevel).toBe(LogLevel.DEBUG);
      expect(config.truncateRawOutput).toBe(1000);
    });
  });

  describe('logAICallStart', () => {
    it('should log AI call start with all parameters', () => {
      const requestId = 'req-123';
      
      logAICallStart(requestId, 'ai_call_start', { extra: 'data' }, 'org-456', 'prompt-789', 'gpt-4');
      
      expect(console.info).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"requestId":"req-123"'));
      expect(console.info).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"event":"ai_call_start"'));
      expect(console.info).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"orgId":"org-456"'));
      expect(console.info).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"promptId":"prompt-789"'));
      expect(console.info).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"model":"gpt-4"'));
      expect(console.info).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"extra":"data"'));
    });

    it('should log AI call start with minimal parameters', () => {
      const requestId = 'req-123';
      
      logAICallStart(requestId, 'ai_call_start');
      
      expect(console.info).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"requestId":"req-123"'));
      expect(console.info).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"event":"ai_call_start"'));
    });
  });

  describe('logAICallComplete', () => {
    it('should log AI call completion', () => {
      const requestId = 'req-123';
      const callData: AICallLogData = {
        model: 'gpt-4',
        latencyMs: 1500,
        retries: 1,
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        costEstimate: 0.01,
        success: true,
      };
      
      logAICallComplete(requestId, 'ai_call_complete', callData, 'org-456', 'prompt-789');
      
      expect(console.info).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"requestId":"req-123"'));
      expect(console.info).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"event":"ai_call_complete"'));
      expect(console.info).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"model":"gpt-4"'));
      expect(console.info).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"latencyMs":1500'));
      expect(console.info).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"success":true'));
    });
  });

  describe('logAICallError', () => {
    it('should log AI call error', () => {
      const requestId = 'req-123';
      const error = new Error('Test error');
      const callData = { retries: 2 };
      
      logAICallError(requestId, 'ai_call_error', error, callData, 'org-456', 'prompt-789');
      
      expect(console.error).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"requestId":"req-123"'));
      expect(console.error).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"event":"ai_call_error"'));
      expect(console.error).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"error":{"message":"Test error"'));
      expect(console.error).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"retries":2'));
    });
  });

  describe('logAICallRetry', () => {
    it('should log AI call retry', () => {
      const requestId = 'req-123';
      
      logAICallRetry(requestId, 'ai_call_retry', 2, 'Invalid JSON', 'org-456', 'prompt-789');
      
      expect(console.warn).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"requestId":"req-123"'));
      expect(console.warn).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"event":"ai_call_retry"'));
      expect(console.warn).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"attempt":2'));
      expect(console.warn).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"reason":"Invalid JSON"'));
    });
  });

  describe('logAIValidationError', () => {
    it('should log validation error with raw output', () => {
      const requestId = 'req-123';
      const validationErrors = ['field1: required', 'field2: invalid'];
      const rawOutput = '{"invalid": json content}';
      
      logAIValidationError(requestId, 'ai_validation_error', validationErrors, rawOutput, 'org-456', 'prompt-789');
      
      expect(console.warn).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"requestId":"req-123"'));
      expect(console.warn).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"event":"ai_validation_error"'));
      expect(console.warn).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"validationErrors":["field1: required","field2: invalid"]'));
      expect(console.warn).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"rawOutputLength":25'));
      expect(console.warn).toHaveBeenCalledWith('AI_LOG', expect.stringMatching(/.*"rawOutputPreview":".*\{\\\"invalid\\\": json content\}".*/));
    });

    it('should log validation error without raw output', () => {
      const requestId = 'req-123';
      const validationErrors = ['field1: required'];
      
      logAIValidationError(requestId, 'ai_validation_error', validationErrors);
      
      expect(console.warn).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"validationErrors":["field1: required"]'));
      expect(console.warn).not.toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"rawOutputLength"'));
    });
  });

  describe('logAIParseError', () => {
    it('should log parse error with truncated raw output', () => {
      const requestId = 'req-123';
      const longRawOutput = 'x'.repeat(300);
      
      logAIParseError(requestId, 'ai_parse_error', 'Invalid JSON', longRawOutput, 'org-456', 'prompt-789');
      
      expect(console.warn).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"requestId":"req-123"'));
      expect(console.warn).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"event":"ai_parse_error"'));
      expect(console.warn).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"parseError":"Invalid JSON"'));
      expect(console.warn).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"rawOutputLength":300'));
      expect(console.warn).toHaveBeenCalledWith('AI_LOG', expect.stringMatching(/.*"rawOutputPreview":"xxxxxxxxxxxxxx.*\.\.\.".*/));
    });
  });

  describe('logAIEvent', () => {
    it('should log generic AI event', () => {
      const requestId = 'req-123';
      const data = { custom: 'data' };
      
      logAIEvent(LogLevel.INFO, requestId, 'custom_event', data);
      
      expect(console.info).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"requestId":"req-123"'));
      expect(console.info).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"event":"custom_event"'));
      expect(console.info).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"custom":"data"'));
    });

    it('should log AI event with error', () => {
      const requestId = 'req-123';
      const error = new Error('Custom error');
      
      logAIEvent(LogLevel.ERROR, requestId, 'custom_error', undefined, error);
      
      expect(console.error).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"requestId":"req-123"'));
      expect(console.error).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"event":"custom_error"'));
      expect(console.error).toHaveBeenCalledWith('AI_LOG', expect.stringContaining('"error":{"message":"Custom error"'));
    });
  });

  describe('extractCallData', () => {
    it('should extract call data from complete result', () => {
      const result = {
        value: { data: 'test' },
        meta: {
          model: 'gpt-4',
          latencyMs: 1500,
          retries: 1,
          inputTokens: 100,
          outputTokens: 50,
          costEstimate: 0.01,
        },
      };
      
      const callData = extractCallData(result, true);
      
      expect(callData).toEqual({
        model: 'gpt-4',
        latencyMs: 1500,
        retries: 1,
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        costEstimate: 0.01,
        success: true,
      });
    });

    it('should handle partial result', () => {
      const result = {
        meta: {
          model: 'gpt-3.5-turbo',
          latencyMs: 800,
          inputTokens: 0,
          outputTokens: 0,
          retries: 0,
        },
      };
      
      const callData = extractCallData(result, false);
      
      expect(callData).toEqual({
        model: 'gpt-3.5-turbo',
        latencyMs: 800,
        retries: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costEstimate: undefined,
        success: false,
      });
    });

    it('should handle empty result', () => {
      const result = {};
      
      const callData = extractCallData(result, true);
      
      expect(callData).toEqual({
        model: 'unknown',
        latencyMs: 0,
        retries: 0,
        inputTokens: undefined,
        outputTokens: undefined,
        totalTokens: 0,
        costEstimate: undefined,
        success: true,
      });
    });
  });
});
