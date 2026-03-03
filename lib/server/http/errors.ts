/**
 * HTTP Error Response Mapping
 * Maps AI errors to standard HTTP responses
 * 
 * IMPORTANT: This module must only be imported from server-side code.
 * Do NOT import from any files that use "use client" directive.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  AIError, 
  isAIError, 
  fromLLMCallError,
  AIConfigError,
  AIParseError,
  AISchemaError,
  AIRateLimitError,
  AITimeoutError,
  AIUnknownError,
  AIInputValidationError
} from '../ai/errors';
import { LLMCallError } from '../ai/call';

// Standard error response interface
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: Record<string, any>;
  };
}

// Convert any error to AI error if possible, then to HTTP response
export function toHttpError(error: unknown, requestId?: string): NextResponse {
  // If it's already an AI error, convert directly
  if (isAIError(error)) {
    return NextResponse.json(error.toJSON(), {
      status: error.statusCode,
      headers: {
        'Content-Type': 'application/json',
        ...(requestId && { 'X-Request-ID': requestId }),
      },
    });
  }

  // If it's an LLM call error, convert to AI error first
  if (error && typeof error === 'object' && 'code' in error) {
    const llmError = error as LLMCallError;
    const aiError = fromLLMCallError(llmError, requestId);
    return NextResponse.json(aiError.toJSON(), {
      status: aiError.statusCode,
      headers: {
        'Content-Type': 'application/json',
        ...(requestId && { 'X-Request-ID': requestId }),
      },
    });
  }

  // Handle standard JavaScript errors
  if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
      const timeoutError = new AITimeoutError('Request timeout', requestId);
      return NextResponse.json(timeoutError.toJSON(), {
        status: timeoutError.statusCode,
        headers: {
          'Content-Type': 'application/json',
          ...(requestId && { 'X-Request-ID': requestId }),
        },
      });
    }

    if (error.message.includes('rate limit') || error.message.includes('RATE_LIMIT')) {
      const rateLimitError = new AIRateLimitError('Rate limit exceeded', requestId);
      return NextResponse.json(rateLimitError.toJSON(), {
        status: rateLimitError.statusCode,
        headers: {
          'Content-Type': 'application/json',
          ...(requestId && { 'X-Request-ID': requestId }),
        },
      });
    }

    // Generic server error
    const unknownError = new AIUnknownError(
      'An unexpected error occurred',
      requestId,
      error.message
    );
    return NextResponse.json(unknownError.toJSON(), {
      status: unknownError.statusCode,
      headers: {
        'Content-Type': 'application/json',
        ...(requestId && { 'X-Request-ID': requestId }),
      },
    });
  }

  // Unknown error type
  const fallbackError = new AIUnknownError(
    'An unexpected error occurred',
    requestId
  );
  return NextResponse.json(fallbackError.toJSON(), {
    status: fallbackError.statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...(requestId && { 'X-Request-ID': requestId }),
    },
  });
}

// Extract request ID from request or generate one
export function getRequestId(request?: NextRequest): string {
  // Try to get from request header
  if (request?.headers) {
    const requestId = request.headers.get('x-request-id');
    if (requestId) {
      return requestId;
    }
  }

  // Generate a new request ID
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Wrap API route handlers with error handling
export function withErrorHandling(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const requestId = getRequestId(request);
    
    try {
      const response = await handler(request, context);
      
      // Add request ID to successful responses
      response.headers.set('X-Request-ID', requestId);
      
      return response;
    } catch (error) {
      console.error(`API Error [${requestId}]:`, error);
      return toHttpError(error, requestId);
    }
  };
}

// Validation helper for input errors
export function createValidationError(
  message: string,
  field?: string,
  requestId?: string
) {
  const error = new AIInputValidationError(message, requestId, field);
  return NextResponse.json(error.toJSON(), {
    status: error.statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...(requestId && { 'X-Request-ID': requestId }),
    },
  });
}

// Rate limit error helper
export function createRateLimitError(
  message?: string,
  retryAfter?: number,
  requestId?: string
) {
  const error = new AIRateLimitError(message, requestId, retryAfter);
  const response = NextResponse.json(error.toJSON(), {
    status: error.statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...(requestId && { 'X-Request-ID': requestId }),
    },
  });

  // Add retry-after header if specified
  if (retryAfter) {
    response.headers.set('Retry-After', retryAfter.toString());
  }

  return response;
}
