/**
 * Prompt framework types and interfaces
 * Defines the structure for all AI prompt templates
 */

// Prompt identifiers with versioning
export type PromptId = 
  | 'jd_analyzer_v1'
  | 'interview_kit_generator_v1'
  | 'candidate_signals_extractor_v1';

// Base prompt payload interface
export interface BasePromptPayload {
  // Common fields that all prompts might need
  context?: string;
  locale?: string;
  strictMode?: boolean;
}

// JD Analyzer payload
export interface JDAnalyzerPayload extends BasePromptPayload {
  jobDescription: string;
  title?: string;
  industry?: string;
  maxSkills?: number;
  maxResponsibilities?: number;
}

// Interview Kit Generator payload
export interface InterviewKitGeneratorPayload extends BasePromptPayload {
  jobTitle: string;
  seniorityLevel: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  keyResponsibilities?: string[];
  competencies?: Array<{
    name: string;
    definition: string;
  }>;
  maxCompetencies?: number;
  maxQuestionsPerType?: number;
}

// Candidate Signals Extractor payload
export interface CandidateSignalsExtractorPayload extends BasePromptPayload {
  cvText: string;
  transcriptText?: string;
  jobTitle?: string;
  jobDescription?: string;
  maxStrengths?: number;
  maxGaps?: number;
  maxRiskFlags?: number;
  maxInconsistencies?: number;
}

// Union type for all prompt payloads
export type PromptPayload = 
  | JDAnalyzerPayload
  | InterviewKitGeneratorPayload
  | CandidateSignalsExtractorPayload;

// Built prompt result
export interface BuiltPrompt {
  system: string;
  user: string;
}

// Prompt template interface
export interface PromptTemplate<T extends PromptPayload = PromptPayload> {
  id: PromptId;
  version: string;
  description: string;
  build: (payload: T) => BuiltPrompt;
  validatePayload?: (payload: T) => boolean;
}

// Prompt registry type
export type PromptRegistry = {
  'jd_analyzer_v1': PromptTemplate<JDAnalyzerPayload>;
  'interview_kit_generator_v1': PromptTemplate<InterviewKitGeneratorPayload>;
  'candidate_signals_extractor_v1': PromptTemplate<CandidateSignalsExtractorPayload>;
};
