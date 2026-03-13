/**
 * Route-Level AI Error Mapping
 * Maps AI layer errors to safe, structured route responses
 */

import { NextResponse } from "next/server";
import { AIError, AIErrorCode, isRetryableError } from "@/lib/ai/errors";

// Standardized route error response structure
export interface RouteAIErrorResponse {
  error: string;
  code?: string;
  message?: string;
  retryable?: boolean;
  requestId?: string;
  details?: string;
}

// Map AI error codes to HTTP status codes
function getHttpStatusForAIError(code: AIErrorCode): number {
  switch (code) {
    case AIErrorCode.PROVIDER_NOT_CONFIGURED:
    case AIErrorCode.INVALID_PROVIDER:
      return 503; // Service Unavailable
      
    case AIErrorCode.TIMEOUT:
      return 504; // Gateway Timeout
      
    case AIErrorCode.RATE_LIMITED:
      return 429; // Too Many Requests
      
    case AIErrorCode.QUOTA_EXCEEDED:
      return 402; // Payment Required
      
    case AIErrorCode.MODEL_NOT_AVAILABLE:
      return 503; // Service Unavailable
      
    case AIErrorCode.NETWORK_ERROR:
      return 502; // Bad Gateway
      
    case AIErrorCode.OUTPUT_INVALID:
    case AIErrorCode.OUTPUT_TOO_LARGE:
    case AIErrorCode.SCHEMA_VALIDATION_FAILED:
    case AIErrorCode.PROVIDER_ERROR:
      return 500; // Internal Server Error
      
    case AIErrorCode.INPUT_VALIDATION_FAILED:
      return 400; // Bad Request
      
    case AIErrorCode.UNKNOWN_ERROR:
    default:
      return 500; // Internal Server Error
  }
}

// Map AI error codes to user-friendly operation-specific messages
function getOperationSpecificMessage(
  code: AIErrorCode, 
  operation: 'jd-analysis' | 'interview-kit' | 'candidate-signals'
): string {
  const operationNames = {
    'jd-analysis': 'Job Description Analysis',
    'interview-kit': 'Interview Kit Generation', 
    'candidate-signals': 'Candidate Signal Analysis'
  };

  const operationName = operationNames[operation];

  switch (code) {
    case AIErrorCode.PROVIDER_NOT_CONFIGURED:
      return `${operationName} service is not configured. Please contact your administrator.`;
      
    case AIErrorCode.TIMEOUT:
      return `${operationName} is taking too long to respond. Please try again.`;
      
    case AIErrorCode.RATE_LIMITED:
      return `${operationName} is temporarily unavailable due to high demand. Please wait a moment and try again.`;
      
    case AIErrorCode.OUTPUT_INVALID:
      return `${operationName} failed due to an unexpected response. Please try again.`;
      
    case AIErrorCode.QUOTA_EXCEEDED:
      return `${operationName} quota has been exceeded. Please contact your administrator.`;
      
    case AIErrorCode.MODEL_NOT_AVAILABLE:
      return `${operationName} is temporarily unavailable. Please try again later.`;
      
    case AIErrorCode.NETWORK_ERROR:
      return `${operationName} is currently unavailable. Please check your connection and try again.`;
      
    case AIErrorCode.INPUT_VALIDATION_FAILED:
      return `Invalid input provided for ${operationName.toLowerCase()}. Please check your data and try again.`;
      
    default:
      return `${operationName} failed. Please try again.`;
  }
}

// Main error mapping function
export function mapAIErrorToRouteResponse(
  error: unknown, 
  operation: 'jd-analysis' | 'interview-kit' | 'candidate-signals',
  requestId?: string
): NextResponse<RouteAIErrorResponse> {
  // Check if it's a structured AI error
  if (error && typeof error === 'object' && 'code' in error) {
    const aiError = error as AIError;
    
    const response: RouteAIErrorResponse = {
      error: `${operation.charAt(0).toUpperCase() + operation.slice(1).replace('-', ' ')} failed`,
      code: aiError.code,
      message: getOperationSpecificMessage(aiError.code, operation),
      retryable: isRetryableError(aiError),
    };

    // Include request ID if available
    if (requestId || aiError.requestId) {
      response.requestId = requestId || aiError.requestId;
    }

    // Include safe details (never expose provider names, API keys, or stack traces)
    if (aiError.details && typeof aiError.details === 'string') {
      // Only include safe details, filter out sensitive information
      const safeDetails = aiError.details
        .replace(/api[_-]?key/gi, '***')
        .replace(/token/gi, '***')
        .replace(/secret/gi, '***')
        .replace(/password/gi, '***')
        .substring(0, 200); // Limit detail length
      
      if (safeDetails && safeDetails !== '***') {
        response.details = safeDetails;
      }
    }

    const statusCode = getHttpStatusForAIError(aiError.code);
    return NextResponse.json(response, { status: statusCode });
  }

  // Handle non-AI errors (shouldn't happen in production, but handle gracefully)
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  
  return NextResponse.json({
    error: `${operation.charAt(0).toUpperCase() + operation.slice(1).replace('-', ' ')} failed`,
    message: `An unexpected error occurred during ${operation.replace('-', ' ')}. Please try again.`,
    details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    retryable: false,
  }, { status: 500 });
}

// Helper function for consistent error handling in routes
export function handleAIRouteError(
  error: unknown,
  operation: 'jd-analysis' | 'interview-kit' | 'candidate-signals',
  requestId?: string
): NextResponse<RouteAIErrorResponse> {
  console.error(`AI ${operation} error:`, error);
  return mapAIErrorToRouteResponse(error, operation, requestId);
}
