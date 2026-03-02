# Prompt Catalog

Complete catalog of all AI prompt templates with their input/output contracts and version information.

## Available Prompts

### JD Analyzer v1 (`jd_analyzer_v1`)

**Purpose**: Extract structured information from job descriptions for candidate matching and interview preparation.

**Input Payload Shape**:
```typescript
interface JDAnalyzerPayload {
  jobTitle?: string;
  rawJD: string;
  industry?: string;
  maxSkills?: number;
  maxResponsibilities?: number;
  context?: string;
  locale?: string;
  strictMode?: boolean;
}
```

**Output Schema**: `JDExtraction_v1`
```json
{
  "roleTitle": "string (max 120 chars)",
  "seniorityLevel": "enum: INTERN, JUNIOR, MID, SENIOR, LEAD, MANAGER, DIRECTOR, UNKNOWN",
  "requiredSkills": "array (max 20) of strings (max 60 chars each)",
  "preferredSkills": "array (max 20) of strings (max 60 chars each)",
  "keyResponsibilities": "array (max 15) of strings (max 160 chars each)",
  "ambiguities": "array (max 10) of objects with: issue (max 160), suggestedClarification (max 200), evidence",
  "unrealisticExpectations": "array (max 10) of objects with: issue (max 160), whyUnrealistic (max 200), evidence",
  "missingCriteria": "array (max 10) of objects with: missing (max 160), suggestedCriteria (max 200)"
}
```

**Version Notes**:
- v1.0.0: Initial implementation with comprehensive defense blocks and evidence-based analysis
- Supports job description parsing with skill extraction and responsibility identification
- Includes injection resistance and protected attributes exclusion
- Evidence-based analysis with source tracking and relevance scoring

---

### Interview Kit Generator v1 (`interview_kit_generator_v1`)

**Purpose**: Generate comprehensive interview kits with competencies, questions, and scoring rubrics aligned to JD extraction.

**Input Payload Shape**:
```typescript
interface InterviewKitGeneratorPayload {
  roleTitle: string;
  seniorityLevel: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  keyResponsibilities?: string[];
  rawJD?: string;
  competencies?: Array<{
    name: string;
    definition: string;
  }>;
  maxCompetencies?: number;
  maxQuestionsPerType?: number;
  context?: string;
  locale?: string;
  strictMode?: boolean;
}
```

**Output Schema**: `InterviewKit_v1`
```json
{
  "roleTitle": "string (max 120 chars)",
  "competencies": "array (max 10) of objects with: name (max 60), definition (max 200), questions",
  "questions": {
    "behavioral": "array (max 12) of Question objects",
    "technical": "array (max 12) of Question objects",
    "scenario": "array (max 12) of Question objects",
    "cultureFit": "array (max 8) of Question objects",
    "redFlagProbes": "array (max 8) of Question objects"
  }
}
```

**Question Object**:
```json
{
  "question": "string (max 220 chars)",
  "whatGoodLooksLike": "string (max 220 chars)",
  "scoringGuide": {
    "1": "string (max 160 chars) - Poor response",
    "3": "string (max 160 chars) - Average response",
    "5": "string (max 160 chars) - Excellent response"
  }
}
```

**Version Notes**:
- v1.0.0: Initial implementation with rubric-based question generation
- Supports competency-driven interview design with 1-3-5 scoring scales
- Includes question category caps and non-duplication rules
- Aligns competencies with questions implicitly

---

### Candidate Signals Extractor v1 (`candidate_signals_extractor_v1`)

**Purpose**: Extract candidate signals with evidence from CV and interview transcripts, focusing on skills and capabilities only.

**Input Payload Shape**:
```typescript
interface CandidateSignalsExtractorPayload {
  cvText: string;
  transcriptText?: string;
  roleTitle?: string;
  requiredSkills?: string[];
  keyResponsibilities?: string[];
  jobContext?: string;
  jobDescription?: string;
  maxStrengths?: number;
  maxGaps?: number;
  maxRiskFlags?: number;
  maxInconsistencies?: number;
  context?: string;
  locale?: string;
  strictMode?: boolean;
}
```

**Output Schema**: `CandidateSignals_v1`
```json
{
  "candidateSummary": "string (max 280 chars)",
  "categoryRatings": {
    "skillMatch": "number 1-5",
    "behavioral": "number 1-5",
    "communication": "number 1-5",
    "cultureFit": "number 1-5"
  },
  "strengths": "array (max 8) of objects with: point (max 160), evidence",
  "gaps": "array (max 8) of objects with: point (max 160), evidence",
  "riskFlags": "array (max 10) of objects with: flag (max 140), severity (LOW/MEDIUM/HIGH), whyItMatters (max 200), evidence",
  "inconsistencies": "array (max 10) of objects with: issue (max 160), evidence",
  "verificationQuestions": "array (max 10) of strings (max 200 chars each)",
  "ignoredAttributesNotice": "string (max 240 chars) - must indicate protected attributes are ignored"
}
```

**Evidence Object**:
```json
{
  "id": "uuid-string",
  "type": "quote",
  "content": "exact text from CV or transcript",
  "source": "cv OR transcript",
  "context": "section where quote was found",
  "relevanceScore": "number 0-100"
}
```

**Version Notes**:
- v1.0.0: Initial implementation with comprehensive protected attributes defense
- Evidence-based analysis from CV/transcript only with confidence downgrading
- Includes injection resistance and explicit protected attributes exclusion
- Requires verification questions for HIGH severity flags
- Enforces candidate summary under 280 characters

---

## Usage Examples

### JD Analyzer
```typescript
import { buildPrompt } from '@/lib/prompts';

const prompt = buildPrompt('jd_analyzer_v1', {
  jobTitle: 'Senior Software Engineer',
  rawJD: 'Looking for experienced React developer...',
  maxSkills: 15
});
```

### Interview Kit Generator
```typescript
const prompt = buildPrompt('interview_kit_generator_v1', {
  roleTitle: 'Software Engineer',
  seniorityLevel: 'SENIOR',
  requiredSkills: ['React', 'TypeScript', 'Node.js'],
  keyResponsibilities: ['Develop applications', 'Lead team'],
  maxCompetencies: 4
});
```

### Candidate Signals Extractor
```typescript
const prompt = buildPrompt('candidate_signals_extractor_v1', {
  cvText: 'Experienced software engineer with React expertise...',
  transcriptText: 'Interview transcript content...',
  roleTitle: 'Software Engineer',
  requiredSkills: ['React', 'TypeScript'],
  maxStrengths: 6,
  maxRiskFlags: 8
});
```

## Breaking Change Rules

- **Schema Changes**: Any modification to output schema requires new prompt version
- **Input Changes**: Breaking changes to input payload shape require new prompt version
- **Behavior Changes**: Significant changes to prompt behavior or logic require new prompt version
- **Defense Changes**: Updates to injection resistance or security measures require new prompt version
- **Non-Breaking**: Minor improvements, bug fixes, or documentation updates can use patch versions

## Versioning Strategy

- **Major Version (X.0.0)**: Breaking changes to schema or input contracts
- **Minor Version (X.Y.0)**: New features without breaking changes
- **Patch Version (X.Y.Z)**: Bug fixes, documentation updates, minor improvements
