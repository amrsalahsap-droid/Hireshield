import { z } from 'zod';

/**
 * Validation utilities for AI schemas
 * Provides standardized error handling and type-safe validation
 */

// Standardized validation error structure
export interface ValidationError {
  code: 'SCHEMA_VALIDATION_FAILED';
  context: string;
  issues: Array<{
    path: string[];
    message: string;
    code: string;
  }>;
}

// Safe parse result with standardized error
export interface SafeParseResult<T> {
  ok: boolean;
  value?: T;
  error?: ValidationError;
}

/**
 * Parse data against schema or throw standardized error
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @param context - Context identifier (e.g., route/module name)
 * @returns Parsed and typed data
 * @throws ValidationError with detailed issues
 */
export function parseOrThrow<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: string
): T {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const error: ValidationError = {
      code: 'SCHEMA_VALIDATION_FAILED',
      context,
      issues: result.error.issues.map(issue => ({
        path: issue.path.map(p => String(p)),
        message: issue.message,
        code: issue.code,
      })),
    };
    
    const errorObj = new Error('Schema validation failed');
    (errorObj as any).validationError = error;
    throw errorObj;
  }
  
  return result.data;
}

/**
 * Safely parse data against schema with standardized error format
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @param context - Context identifier (e.g., route/module name)
 * @returns SafeParseResult with success status and either value or error
 */
export function safeParseWithError<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: string
): SafeParseResult<T> {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const error: ValidationError = {
      code: 'SCHEMA_VALIDATION_FAILED',
      context,
      issues: result.error.issues.map(issue => ({
        path: issue.path.map(p => String(p)),
        message: issue.message,
        code: issue.code,
      })),
    };
    
    return {
      ok: false,
      error,
    };
  }
  
  return {
    ok: true,
    value: result.data,
  };
}

/**
 * Helper to format validation error for API responses
 * @param error - ValidationError instance
 * @returns Formatted error object for API responses
 */
export function formatValidationError(error: ValidationError) {
  return {
    error: {
      code: error.code,
      message: `Schema validation failed in ${error.context}`,
      details: error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    },
  };
}

/**
 * Helper to check if error is a validation error
 * @param error - Error to check
 * @returns True if error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'SCHEMA_VALIDATION_FAILED'
  );
}

/**
 * Parse JSON string and validate against schema
 * @param schema - Zod schema to validate against
 * @param jsonString - JSON string to parse and validate
 * @param context - Context identifier
 * @returns Parsed and validated data
 * @throws ValidationError for both JSON parsing and schema validation
 */
export function parseJsonOrThrow<T>(
  schema: z.ZodType<T>,
  jsonString: string,
  context: string
): T {
  try {
    const data = JSON.parse(jsonString);
    return parseOrThrow(schema, data, context);
  } catch (error) {
    if (error instanceof SyntaxError) {
      const validationError: ValidationError = {
        code: 'SCHEMA_VALIDATION_FAILED',
        context,
        issues: [{
          path: [],
          message: 'Invalid JSON format',
          code: 'INVALID_JSON',
        }],
      };
      const errorObj = new Error('Invalid JSON format');
      (errorObj as any).validationError = validationError;
      throw errorObj;
    }
    throw error;
  }
}

/**
 * Validate and sanitize data for AI model input
 * Ensures data meets schema requirements before sending to AI
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @param context - Context identifier
 * @returns Validated data ready for AI processing
 */
export function validateForAI<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: string
): T {
  const result = parseOrThrow(schema, data, `${context}/ai-input`);
  
  // Additional AI-specific validations could be added here
  // For example: size limits, content sanitization, etc.
  
  return result;
}
