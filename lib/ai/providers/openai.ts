/**
 * OpenAI Provider Stub
 * TODO: Implement in Phase 6 (refactor existing OpenAI code)
 */

import { LLMProvider, ProviderConfig } from '../types';

export class OpenAIProvider implements LLMProvider {
  name: string;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.name = config.name;
    this.config = config;
  }

  async analyzeJD(input: any): Promise<any> {
    throw new Error('OpenAI provider not implemented yet. Use LLM_PROVIDER=mock for development.');
  }

  async generateInterviewKit(input: any): Promise<any> {
    throw new Error('OpenAI provider not implemented yet. Use LLM_PROVIDER=mock for development.');
  }

  async generateCandidateSignals(input: any): Promise<any> {
    throw new Error('OpenAI provider not implemented yet. Use LLM_PROVIDER=mock for development.');
  }
}
