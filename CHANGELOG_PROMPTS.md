# Prompt Changelog

Track all changes to AI prompt templates with version information and breaking change notices.

## [2026-03-02] - Initial Release

### v1.0.0 - All Prompts

**jd_analyzer_v1**:
- Initial implementation with comprehensive defense blocks
- Evidence-based analysis from job descriptions only
- Protected attributes exclusion with explicit list
- JSON-only output enforcement
- Schema: JDExtraction_v1
- Breaking change: New prompt template

**interview_kit_generator_v1**:
- Initial implementation with rubric-based question generation
- Competency-driven interview design with 1-3-5 scoring scales
- Question category caps and non-duplication rules
- Schema: InterviewKit_v1
- Breaking change: New prompt template

**candidate_signals_extractor_v1**:
- Initial implementation with comprehensive protected attributes defense
- Evidence-based analysis from CV/transcript only
- Confidence downgrading when transcript missing
- Verification questions for HIGH severity flags
- Schema: CandidateSignals_v1
- Breaking change: New prompt template

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

## Future Changes

### Planned Updates

**jd_analyzer_v1**:
- Add industry-specific skill taxonomy
- Enhance evidence relevance scoring
- Add salary range extraction (non-protected)

**interview_kit_generator_v1**:
- Add adaptive question difficulty
- Include time allocation suggestions
- Add remote interview considerations

**candidate_signals_extractor_v1**:
- Add skill gap analysis
- Include career trajectory assessment
- Add cultural fit indicators

### Breaking Change Examples

**Non-Breaking**:
```
v1.0.1: Fix typo in schema documentation
v1.0.2: Improve injection resistance wording
```

**Breaking**:
```
v2.0.0: Add new field to JDExtraction schema
v2.0.0: Change input payload structure for candidate signals
```
