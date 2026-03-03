/**
 * Core LLM Call Wrapper
 * Server-only LLM calling with JSON enforcement and retry logic
 * 
 * IMPORTANT: This module must only be imported from server-side code.
 * Do NOT import from any files that use "use client" directive.
 */

import { z } from 'zod';
import { getOpenAIClient } from './client';
import { 
  getOpenAiModelDefault, 
  getOpenAiTemperatureDefault, 
  getOpenAiMaxRetries,
  getOpenAiTimeoutMs
} from './config';

// Metadata schema for LLM call results
export const LLMCallMetaSchema = z.object({
  model: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  costEstimate: z.number().nullable(),
  latencyMs: z.number(),
  retries: z.number(),
});

export type LLMCallMeta = z.infer<typeof LLMCallMetaSchema>;

// Error codes for LLM call failures
export enum LLMErrorCode {
  OUTPUT_INVALID = 'AI_OUTPUT_INVALID',
  CONFIGURATION_ERROR = 'AI_CONFIGURATION_ERROR',
  NETWORK_ERROR = 'AI_NETWORK_ERROR',
  TIMEOUT_ERROR = 'AI_TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'AI_RATE_LIMIT_ERROR',
  UNKNOWN_ERROR = 'AI_UNKNOWN_ERROR',
}

// Structured error object for LLM call failures
export interface LLMCallError extends Error {
  code: LLMErrorCode;
  rawOutput?: string;
  validationErrors?: string[];
  retryCount?: number;
}

// Arguments for the LLM call function
export interface CallLLMAndParseJSONArgs<T = any> {
  promptId?: string;
  system: string;
  user: string;
  schema: z.ZodSchema<T>;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  requestId?: string;
  orgId?: string;
}

// Result type for successful LLM calls
export interface LLMCallResult<T> {
  value: T;
  meta: LLMCallMeta;
}

/**
 * Create a structured LLM error
 */
function createLLMError(
  code: LLMErrorCode,
  message: string,
  rawOutput?: string,
  validationErrors?: string[],
  retryCount?: number
): LLMCallError {
  const error = new Error(message) as LLMCallError;
  error.code = code;
  error.rawOutput = rawOutput;
  error.validationErrors = validationErrors;
  error.retryCount = retryCount;
  return error;
}

/**
 * Extract JSON from LLM response text
 * Handles various JSON formats and extracts the first valid JSON object or array
 */
function extractJSONFromResponse(text: string): string | null {
  const trimmedText = text.trim();
  
  // Try to parse the entire text first
  try {
    JSON.parse(trimmedText);
    return trimmedText;
  } catch {
    // If that fails, try to extract JSON patterns
  }

  // Try to find JSON array boundaries first (arrays should take precedence)
  const arrayMatch = trimmedText.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      JSON.parse(arrayMatch[0]);
      return arrayMatch[0];
    } catch {
      // Invalid JSON, continue to object search
    }
  }

  // Try to find JSON object boundaries
  const objectMatch = trimmedText.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      JSON.parse(objectMatch[0]);
      return objectMatch[0];
    } catch {
      // Invalid JSON
    }
  }

  return null;
}

/**
 * Parse and validate JSON response against Zod schema
 */
function parseAndValidateJSON<T>(
  jsonText: string,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const parsed = JSON.parse(jsonText);
    const result = schema.safeParse(parsed);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        errors: result.error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        )
      };
    }
  } catch (error) {
    return {
      success: false,
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Generate repair prompt for retry attempts
 */
function generateRepairPrompt(validationErrors: string[]): string {
  return `Return ONLY valid JSON matching the schema. Fix these issues:\n${validationErrors.join('\n')}`;
}

/**
 * Estimate cost for OpenAI API call (rough estimate)
 * @returns Cost estimate or null if tokens are not available
 */
function estimateCost(model: string, inputTokens: number, outputTokens: number): number | null {
  // If no tokens available, return null
  if (inputTokens === 0 && outputTokens === 0) {
    return null;
  }

  // Rough cost estimates (should be updated based on actual pricing)
  const costPer1KTokens: Record<string, { input: number; output: number }> = {
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  };

  const pricing = costPer1KTokens[model];
  if (!pricing) {
    return null; // Unknown model
  }

  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
}

/**
 * Core LLM call function with JSON enforcement and retries
 * 
 * @param args - Arguments for the LLM call
 * @returns Promise resolving to validated JSON result with metadata
 * @throws LLMCallError with structured error information
 */
export async function callLLMAndParseJSON<T>({
  promptId,
  system,
  user,
  schema,
  model = getOpenAiModelDefault(),
  temperature = getOpenAiTemperatureDefault(),
  maxOutputTokens,
  requestId,
  orgId,
}: CallLLMAndParseJSONArgs<T>): Promise<LLMCallResult<T>> {
  const startTime = Date.now();
  const maxRetries = getOpenAiMaxRetries();
  let retryCount = 0;
  let lastRawOutput: string | undefined;
  let currentUserMessage = user; // Keep track of current user message for retries

  try {
    const client = getOpenAIClient();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      retryCount = attempt;

      try {
        // Build messages for this attempt
        const messages: Array<{ role: 'system' | 'user'; content: string }> = [
          { role: 'system', content: system },
        ];

        messages.push({ role: 'user', content: currentUserMessage });

        // Make API call
        const response = await client.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxOutputTokens,
          response_format: { type: 'json_object' }, // Enforce JSON response
          ...(requestId && { user: requestId }),
        });

        const rawOutput = response.choices[0]?.message?.content;
        if (!rawOutput) {
          throw createLLMError(
            LLMErrorCode.OUTPUT_INVALID,
            'No content received from LLM',
            undefined,
            undefined,
            retryCount
          );
        }

        lastRawOutput = rawOutput;

        // Extract JSON from response
        const jsonText = extractJSONFromResponse(rawOutput);
        if (!jsonText) {
          // If this is not the last attempt, retry with repair prompt
          if (attempt < maxRetries) {
            currentUserMessage = `${user}\n\n${generateRepairPrompt(['No valid JSON found in response'])}`;
            continue;
          }

          // Last attempt failed, throw structured error
          throw createLLMError(
            LLMErrorCode.OUTPUT_INVALID,
            'No valid JSON found in LLM response',
            rawOutput.substring(0, 500), // Truncate for logging
            undefined,
            retryCount
          );
        }

        // Parse and validate JSON
        const validationResult = parseAndValidateJSON(jsonText, schema);
        
        if (!validationResult.success) {
          // If this is not the last attempt, retry with repair prompt
          if (attempt < maxRetries) {
            // Update the user message to include repair instructions
            currentUserMessage = `${user}\n\n${generateRepairPrompt(validationResult.errors)}`;
            continue;
          }

          // Last attempt failed, throw structured error
          throw createLLMError(
            LLMErrorCode.OUTPUT_INVALID,
            'JSON validation failed after all retries',
            rawOutput.substring(0, 500), // Truncate for logging
            validationResult.errors,
            retryCount
          );
        }

        // Success! Build metadata
        const endTime = Date.now();
        const inputTokens = response.usage?.prompt_tokens || 0;
        const outputTokens = response.usage?.completion_tokens || 0;

        const meta: LLMCallMeta = {
          model,
          inputTokens,
          outputTokens,
          costEstimate: estimateCost(model, inputTokens, outputTokens),
          latencyMs: endTime - startTime,
          retries: retryCount,
        };

        return {
          value: validationResult.data,
          meta,
        };

      } catch (error) {
        // If this is a network/timeout error and we have retries left, continue
        if (attempt < maxRetries && 
            (error instanceof Error && 
             (error.name === 'TimeoutError' || 
              error.message.includes('timeout') ||
              error.message.includes('network') ||
              error.message.includes('rate limit')))) {
          continue;
        }

        // Re-throw LLM errors
        if (error && typeof error === 'object' && 'code' in error) {
          throw error;
        }

        // Wrap other errors
        throw createLLMError(
          LLMErrorCode.UNKNOWN_ERROR,
          error instanceof Error ? error.message : 'Unknown error occurred',
          lastRawOutput?.substring(0, 500),
          undefined,
          retryCount
        );
      }
    }

    // This should never be reached, but TypeScript requires it
    throw createLLMError(
      LLMErrorCode.UNKNOWN_ERROR,
      'Unexpected error in LLM call',
      lastRawOutput?.substring(0, 500),
      undefined,
      retryCount
    );

  } catch (error) {
    // Ensure we always throw LLMCallError
    if (error && typeof error === 'object' && 'code' in error) {
      throw error;
    }

    throw createLLMError(
      LLMErrorCode.UNKNOWN_ERROR,
      error instanceof Error ? error.message : 'Unknown error occurred',
      lastRawOutput?.substring(0, 500),
      undefined,
      retryCount
    );
  }
}
