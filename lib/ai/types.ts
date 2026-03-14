/**
 * AI Service Types
 * Shared types and interfaces for all AI-powered features
 */

import { z } from 'zod';
import { EvidenceSchema_v1, CONSTRAINTS } from './base';

// Base input/output types for AI operations
export interface BaseAIInput {
  requestId?: string;
  orgId?: string;
}

export interface BaseAIResult {
  requestId?: string;
  success: boolean;
  data?: any;
  error?: any;
  meta?: AIMeta;
}

export interface AIMeta {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costEstimate?: number;
  latencyMs: number;
  retries: number;
}

// JD Analysis types
export interface AnalyzeJDInput extends BaseAIInput {
  jobTitle: string;
  rawJD: string;
}

export interface AnalyzeJDResult {
  roleTitle?: string;
  requiredSkills: string[];
  seniorityLevel: string;
  department?: string;
  estimatedSalary?: {
    min: number;
    max: number;
    currency: string;
  };
  experienceLevel: string;
  keyResponsibilities: string[];
  qualifications: string[];
  preferredQualifications?: string[];
  // Quality analysis fields
  ambiguities?: Array<{
    issue: string;
    suggestedClarification: string;
    evidence?: {
      content: string;
      source: string;
    };
  }>;
  unrealisticExpectations?: Array<{
    issue: string;
    whyUnrealistic: string;
    evidence?: {
      content: string;
      source: string;
    };
  }>;
  missingCriteria?: Array<{
    missing: string;
    suggestedCriteria: string;
  }>;
  // Development-only diagnostic metadata
  __devDiagnostics?: {
    activeProvider: string;
    matchedScenario?: string;
    usedGenericFallback: boolean;
    roleTitleExtractionSuccess: boolean;
    extractionMethod: 'scenario' | 'generic-fallback' | 'role-extraction' | 'weak-extraction';
    genericFallbackReason?: string;
    keywordMatchCount?: number;
    processingTimeMs?: number;
    confidence?: 'high' | 'medium' | 'low';
  };
}

// Interview Kit types
export interface InterviewKitInput extends BaseAIInput {
  jobTitle: string;
  rawJD: string;
  extractedSkills?: string[];
  seniorityLevel?: string;
  experienceLevel?: string;
}

export interface InterviewKitResult {
  technicalQuestions: Array<{
    question: string;
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
    expectedAnswer?: string;
  }>;
  behavioralQuestions: Array<{
    question: string;
    competency: string;
    followUp?: string[];
  }>;
  caseStudy?: {
    title: string;
    description: string;
    timeLimit: number;
    evaluationCriteria: string[];
  };
  interviewStructure: {
    totalDuration: number;
    sections: Array<{
      name: string;
      duration: number;
      description: string;
    }>;
  };
}

// Candidate Signals types
export interface CandidateSignalsInput extends BaseAIInput {
  candidateProfile: {
    name?: string;
    email?: string;
    resume?: string;
    experience?: Array<{
      company: string;
      role: string;
      duration: string;
      description?: string;
    }>;
    skills?: string[];
    education?: Array<{
      degree: string;
      school: string;
      year?: string;
    }>;
  };
  jobRequirements: {
    title: string;
    description: string;
    requiredSkills: string[];
    experienceLevel: string;
    seniorityLevel?: string;
  };
}

export interface CandidateSignalsResult {
  overallScore: number;
  skillMatch: {
    score: number;
    matchedSkills: string[];
    missingSkills: string[];
    additionalSkills: string[];
  };
  experienceMatch: {
    score: number;
    relevantYears: number;
    levelMatch: boolean;
  };
  educationMatch: {
    score: number;
    relevantDegree: boolean;
  };
  riskSignals: Array<{
    type: 'high' | 'medium' | 'low';
    category: 'experience' | 'skills' | 'education' | 'other';
    description: string;
  }>;
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no';
  reasoning: string;
}

// Provider interface
export interface LLMProvider {
  name: string;
  analyzeJD(input: AnalyzeJDInput): Promise<AnalyzeJDResult>;
  generateInterviewKit(input: InterviewKitInput): Promise<InterviewKitResult>;
  generateCandidateSignals(input: CandidateSignalsInput): Promise<CandidateSignalsResult>;
}

// Provider configuration
export interface ProviderConfig {
  name: string;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  timeout: number;
  maxRetries: number;
  temperature?: number;
}

// Export all types for easy importing
export type {
  BaseAIInput,
  BaseAIResult,
  AIMeta,
  AnalyzeJDInput,
  AnalyzeJDResult,
  InterviewKitInput,
  InterviewKitResult,
  CandidateSignalsInput,
  CandidateSignalsResult,
  LLMProvider,
  ProviderConfig,
};
