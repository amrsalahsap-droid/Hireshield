/**
 * OpenAI Client Singleton
 * Server-only OpenAI client instance with singleton pattern
 * 
 * IMPORTANT: This module must only be imported from server-side code.
 * Do NOT import from any files that use "use client" directive.
 */

import OpenAI from 'openai';
import { getOpenAiApiKey, getOpenAiTimeoutMs } from './config';

// Singleton instance cache
let openAIClient: OpenAI | null = null;

/**
 * Get the OpenAI client singleton instance
 * @returns OpenAI client instance
 * @throws Error if OpenAI API key is not configured
 */
export function getOpenAIClient(): OpenAI {
  // Return existing instance if already created
  if (openAIClient) {
    return openAIClient;
  }

  // Validate configuration
  const apiKey = getOpenAiApiKey();
  const timeoutMs = getOpenAiTimeoutMs();

  if (!apiKey) {
    throw new Error(
      'OpenAI API key is not configured. ' +
      'Please set OPENAI_API_KEY environment variable.'
    );
  }

  // Create new OpenAI client instance
  openAIClient = new OpenAI({
    apiKey,
    timeout: timeoutMs,
    // Add default configuration for safety and reliability
    maxRetries: 2,
    // Add organization ID if needed in the future
    // organization: process.env.OPENAI_ORG_ID,
  });

  return openAIClient;
}

/**
 * Reset the OpenAI client singleton (useful for testing)
 * @internal This function should only be used in test environments
 */
export function resetOpenAIClient(): void {
  openAIClient = null;
}

/**
 * Check if OpenAI client is initialized
 * @returns true if client is initialized, false otherwise
 */
export function isOpenAIClientInitialized(): boolean {
  return openAIClient !== null;
}

/**
 * Get OpenAI client configuration (without exposing the API key)
 * @returns Partial configuration object
 */
export function getOpenAIClientConfig() {
  try {
    return {
      timeout: getOpenAiTimeoutMs(),
      maxRetries: 2,
      isConfigured: !!getOpenAiApiKey(),
    };
  } catch (error) {
    // If configuration is not set, return default values
    return {
      timeout: 30000,
      maxRetries: 2,
      isConfigured: false,
    };
  }
}
