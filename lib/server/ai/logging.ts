/**
 * AI Structured Logging
 * Centralized logging for AI operations with observability
 * 
 * IMPORTANT: This module must only be imported from server-side code.
 * Do NOT import from any files that use "use client" directive.
 */

import { randomUUID } from 'crypto';
import { LLMCallResult, LLMCallMeta } from './call';

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

// Structured log entry interface
export interface AILogEntry {
  timestamp: string;
  level: LogLevel;
  requestId: string;
  orgId?: string;
  promptId?: string;
  event: string;
  data?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

// AI call log data
export interface AICallLogData {
  model: string;
  latencyMs: number;
  retries: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  costEstimate?: number;
  success: boolean;
}

// Configuration for logging
export interface AILogConfig {
  enableConsoleLogging: boolean;
  enableFileLogging: boolean;
  logLevel: LogLevel;
  truncateRawOutput: number;
}

// Default logging configuration
const DEFAULT_CONFIG: AILogConfig = {
  enableConsoleLogging: true,
  enableFileLogging: false, // Can be enabled later
  logLevel: LogLevel.INFO,
  truncateRawOutput: 500,
};

// Current configuration (can be modified at runtime)
let logConfig: AILogConfig = { ...DEFAULT_CONFIG };

/**
 * Generate a unique request ID for tracing
 * @returns UUID v4 string
 */
export function createRequestId(): string {
  return randomUUID();
}

/**
 * Configure AI logging behavior
 * @param config - Logging configuration
 */
export function configureAILogging(config: Partial<AILogConfig>): void {
  logConfig = { ...logConfig, ...config };
}

/**
 * Get current logging configuration
 * @returns Current logging configuration
 */
export function getAILogConfig(): AILogConfig {
  return { ...logConfig };
}

/**
 * Create a structured log entry
 * @param level - Log level
 * @param requestId - Request ID for tracing
 * @param event - Event name
 * @param data - Additional data
 * @param error - Error information
 * @returns Log entry
 */
function createLogEntry(
  level: LogLevel,
  requestId: string,
  event: string,
  data?: Record<string, any>,
  error?: Error
): AILogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    requestId,
    event,
    data,
    ...(error && {
      error: {
        message: error.message,
        stack: error.stack,
        ...(error && typeof error === 'object' && 'code' in error && { code: (error as any).code }),
      },
    }),
  };
}

/**
 * Write log entry to configured outputs
 * @param entry - Log entry to write
 */
function writeLog(entry: AILogEntry): void {
  // Console logging
  if (logConfig.enableConsoleLogging) {
    const logMethod = entry.level === LogLevel.ERROR ? 'error' :
                     entry.level === LogLevel.WARN ? 'warn' :
                     entry.level === LogLevel.INFO ? 'info' : 'debug';
    
    console[logMethod]('AI_LOG', JSON.stringify(entry));
  }

  // File logging (placeholder for future implementation)
  if (logConfig.enableFileLogging) {
    // TODO: Implement file logging if needed
    // Could write to a structured log file or external logging service
  }
}

/**
 * Log AI call start
 * @param requestId - Request ID
 * @param event - Event name
 * @param data - Additional data
 * @param orgId - Organization ID
 * @param promptId - Prompt ID
 * @param model - AI model being used
 */
export function logAICallStart(
  requestId: string,
  event: string,
  data?: Record<string, any>,
  orgId?: string,
  promptId?: string,
  model?: string
): void {
  const entry = createLogEntry(
    LogLevel.INFO,
    requestId,
    event,
    {
      ...data,
      orgId,
      promptId,
      model,
    }
  );
  writeLog(entry);
}

/**
 * Log AI call completion
 * @param requestId - Request ID
 * @param event - Event name
 * @param callData - Call performance and usage data
 * @param orgId - Organization ID
 * @param promptId - Prompt ID
 */
export function logAICallComplete(
  requestId: string,
  event: string,
  callData: AICallLogData,
  orgId?: string,
  promptId?: string
): void {
  const entry = createLogEntry(
    LogLevel.INFO,
    requestId,
    event,
    {
      ...callData,
      orgId,
      promptId,
    }
  );
  writeLog(entry);
}

/**
 * Log AI call error
 * @param requestId - Request ID
 * @param event - Event name
 * @param error - Error that occurred
 * @param callData - Partial call data (if available)
 * @param orgId - Organization ID
 * @param promptId - Prompt ID
 */
export function logAICallError(
  requestId: string,
  event: string,
  error: Error,
  callData?: Partial<AICallLogData>,
  orgId?: string,
  promptId?: string
): void {
  const entry = createLogEntry(
    LogLevel.ERROR,
    requestId,
    event,
    {
      ...callData,
      orgId,
      promptId,
    },
    error
  );
  writeLog(entry);
}

/**
 * Log AI call retry
 * @param requestId - Request ID
 * @param event - Event name
 * @param attempt - Current attempt number
 * @param reason - Reason for retry
 * @param orgId - Organization ID
 * @param promptId - Prompt ID
 */
export function logAICallRetry(
  requestId: string,
  event: string,
  attempt: number,
  reason: string,
  orgId?: string,
  promptId?: string
): void {
  const entry = createLogEntry(
    LogLevel.WARN,
    requestId,
    event,
    {
      orgId,
      promptId,
      attempt,
      reason,
    }
  );
  writeLog(entry);
}

/**
 * Log AI validation error
 * @param requestId - Request ID
 * @param event - Event name
 * @param validationErrors - List of validation errors
 * @param rawOutput - Raw output (truncated)
 * @param orgId - Organization ID
 * @param promptId - Prompt ID
 */
export function logAIValidationError(
  requestId: string,
  event: string,
  validationErrors: string[],
  rawOutput?: string,
  orgId?: string,
  promptId?: string
): void {
  const entry = createLogEntry(
    LogLevel.WARN,
    requestId,
    event,
    {
      orgId,
      promptId,
      validationErrors,
      ...(rawOutput && {
        rawOutputLength: rawOutput.length,
        rawOutputPreview: rawOutput.substring(0, 200) + (rawOutput.length > 200 ? '...' : ''),
      }),
    }
  );
  writeLog(entry);
}

/**
 * Log AI parse error
 * @param requestId - Request ID
 * @param event - Event name
 * @param parseError - Parse error message
 * @param rawOutput - Raw output (truncated)
 * @param orgId - Organization ID
 * @param promptId - Prompt ID
 */
export function logAIParseError(
  requestId: string,
  event: string,
  parseError: string,
  rawOutput?: string,
  orgId?: string,
  promptId?: string
): void {
  const entry = createLogEntry(
    LogLevel.WARN,
    requestId,
    event,
    {
      orgId,
      promptId,
      parseError,
      ...(rawOutput && {
        rawOutputLength: rawOutput.length,
        rawOutputPreview: rawOutput.substring(0, 200) + (rawOutput.length > 200 ? '...' : ''),
      }),
    }
  );
  writeLog(entry);
}

/**
 * Log generic AI event
 * @param level - Log level
 * @param requestId - Request ID
 * @param event - Event name
 * @param data - Event data
 * @param error - Optional error
 */
export function logAIEvent(
  level: LogLevel,
  requestId: string,
  event: string,
  data?: Record<string, any>,
  error?: Error
): void {
  const entry = createLogEntry(level, requestId, event, data, error);
  writeLog(entry);
}

/**
 * Extract call data from LLM result for logging
 * @param result - LLM call result
 * @param success - Whether the call was successful
 * @returns Formatted call data
 */
export function extractCallData(
  result: Partial<LLMCallResult<any>>,
  success: boolean
): AICallLogData {
  const meta = result.meta || {} as LLMCallMeta;
  
  return {
    model: meta.model || 'unknown',
    latencyMs: meta.latencyMs || 0,
    retries: meta.retries || 0,
    inputTokens: meta.inputTokens,
    outputTokens: meta.outputTokens,
    totalTokens: (meta.inputTokens || 0) + (meta.outputTokens || 0),
    costEstimate: meta.costEstimate || undefined,
    success,
  };
}
