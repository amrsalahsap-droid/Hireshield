/**
 * Prompt module exports and registry
 * Central entry point for all AI prompt templates
 */

export * from './types';
export * from './jd_analyzer_v1';
export * from './interview-kit-generator';
export * from './candidate-signals-extractor';
export * from './defense';

import { PromptRegistry, PromptId, PromptPayload, BuiltPrompt, PromptTemplate } from './types';
import { jdAnalyzerV1 } from './jd_analyzer_v1';
import { interviewKitGeneratorV1 } from './interview-kit-generator';
import { candidateSignalsExtractorV1 } from './candidate-signals-extractor';

// Prompt registry - maps IDs to prompt templates
export const PROMPT_REGISTRY: PromptRegistry = {
  'jd_analyzer_v1': jdAnalyzerV1,
  'interview_kit_generator_v1': interviewKitGeneratorV1,
  'candidate_signals_extractor_v1': candidateSignalsExtractorV1,
};

/**
 * Build prompt from ID and payload
 * @param promptId - The prompt identifier
 * @param payload - The prompt payload
 * @returns Built prompt with system and user messages
 */
export function buildPrompt<T extends PromptPayload>(
  promptId: PromptId,
  payload: T
): BuiltPrompt {
  const prompt = PROMPT_REGISTRY[promptId];
  
  if (!prompt) {
    throw new Error(`Prompt not found: ${promptId}`);
  }

  // Type assertion to handle generic types
  const typedPrompt = prompt as PromptTemplate<T>;
  
  // Validate payload if validator exists
  if (typedPrompt.validatePayload && !typedPrompt.validatePayload(payload)) {
    throw new Error(`Invalid payload for prompt: ${promptId}`);
  }

  return typedPrompt.build(payload);
}

/**
 * Get all available prompt IDs
 * @returns Array of available prompt IDs
 */
export function getAvailablePrompts(): PromptId[] {
  return Object.keys(PROMPT_REGISTRY) as PromptId[];
}

/**
 * Get prompt template by ID
 * @param promptId - The prompt identifier
 * @returns Prompt template or undefined if not found
 */
export function getPromptTemplate(promptId: PromptId) {
  return PROMPT_REGISTRY[promptId];
}

/**
 * Validate payload for a specific prompt
 * @param promptId - The prompt identifier
 * @param payload - The payload to validate
 * @returns True if payload is valid
 */
export function validatePromptPayload(
  promptId: PromptId,
  payload: PromptPayload
): boolean {
  const prompt = PROMPT_REGISTRY[promptId];
  if (!prompt || !prompt.validatePayload) {
    return true; // No validation required
  }
  
  // Type assertion for validation
  const typedPrompt = prompt as PromptTemplate<any>;
  return typedPrompt.validatePayload ? typedPrompt.validatePayload(payload) : true;
}
