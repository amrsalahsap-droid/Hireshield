# AI Contracts - Schema Versioning Guide

## Overview

This document explains how to version AI output schemas to maintain backward compatibility and prevent breaking changes in existing evaluations.

## Schema Versioning Strategy

### Version Format
- Use semantic versioning suffix: `_v1`, `_v2`, `_v3`, etc.
- Example: `JDExtraction_v1`, `JDExtraction_v2`

### When to Create a New Version

**Create v2 when:**
- Adding new required fields
- Removing existing fields
- Changing field types
- Changing field names
- Changing validation rules (e.g., making optional field required)

**Keep v1 when:**
- Adding new optional fields
- Fixing validation bugs without changing contract
- Improving documentation
- Performance optimizations

## Versioning Process

### 1. Create New Schema Version

```typescript
// lib/schemas/jd-extraction-v2.ts
export const JDExtraction_v2 = z.object({
  // Keep all v1 fields
  roleTitle: z.string().max(120),
  seniorityLevel: z.enum([...]),
  requiredSkills: z.array(z.string()).max(20),
  
  // NEW required field - requires v2
  department: z.string().max(100),
  
  // NEW optional field - could be added to v1
  salaryRange: z.string().max(50).optional(),
}).strict();
```

### 2. Update Schema Registry

```typescript
// lib/schemas/index.ts
export const SCHEMAS = {
  v1: {
    // Keep v1 schemas for existing evaluations
    jdExtraction: JDExtraction_v1,
    interviewKit: InterviewKit_v1,
    // ...
  },
  v2: {
    // Add new v2 schemas
    jdExtraction: JDExtraction_v2,
    // Keep others at v1 if unchanged
    interviewKit: InterviewKit_v1,
    // ...
  }
} as const;
```

### 3. Update Contract Change Guard

```typescript
// lib/tests/contract-change-guard.test.ts
const EXPECTED_V2_KEYS = {
  jdExtraction: [
    // All v1 keys
    ...EXPECTED_V1_KEYS.jdExtraction,
    // New v2 keys
    'department',
    'salaryRange' // optional but tracked
  ],
  // Other schemas unchanged
  interviewKit: EXPECTED_V1_KEYS.interviewKit,
  // ...
};
```

### 4. Migration Strategy

**Database Migration:**
```sql
-- Add new column with default value
ALTER TABLE evaluations ADD COLUMN department TEXT DEFAULT '';
```

**API Migration:**
```typescript
// Support both versions during transition
function getSchemaVersion(evaluationDate: Date) {
  const cutoffDate = new Date('2026-03-02');
  return evaluationDate >= cutoffDate ? 'v2' : 'v1';
}
```

## Breaking Changes Checklist

Before creating v2, verify:

- [ ] New field is truly required for business logic
- [ ] Existing data can be migrated or has sensible default
- [ ] API endpoints can handle both versions
- [ ] Frontend can display both versions
- [ ] Tests cover both versions
- [ ] Documentation updated

## Non-Breaking Changes

These can be added to existing v1 schema:

```typescript
// Add optional field
export const JDExtraction_v1 = z.object({
  // existing fields...
  newOptionalField: z.string().max(100).optional(),
}).strict();
```

## Testing Schema Changes

### 1. Update Golden Samples

```bash
# Create new golden sample
cp testdata/ai/jd_extraction_v1.valid.json testdata/ai/jd_extraction_v2.valid.json
# Edit v2 sample to include new fields
```

### 2. Add Migration Tests

```typescript
describe('Schema Migration v1 to v2', () => {
  it('should migrate v1 data to v2', () => {
    const v1Data = { /* v1 sample */ };
    const v2Data = migrateV1ToV2(v1Data);
    expect(JDExtraction_v2.parse(v2Data)).toBeDefined();
  });
});
```

## Deployment Strategy

### Phase 1: Deploy v2 Schema
- Deploy new schema alongside v1
- No production usage yet

### Phase 2: Enable v2 for New Data
- New evaluations use v2
- Existing data remains v1

### Phase 3: Migrate Existing Data (Optional)
- Batch migrate old evaluations if needed
- Update API to prefer v2

### Phase 4: Deprecate v1
- Remove v1 after transition period
- Update all references to v2

## Best Practices

1. **Forward Compatibility**: Design v2 to be easily upgradable to v3
2. **Default Values**: Provide sensible defaults for new required fields
3. **Documentation**: Document why each version was created
4. **Testing**: Maintain tests for all active versions
5. **Communication**: Notify teams about breaking changes

## Example: Complete v2 Migration

```typescript
// 1. Create v2 schema
export const JDExtraction_v2 = z.object({
  // All v1 fields unchanged
  roleTitle: z.string().max(120),
  seniorityLevel: z.enum([...]),
  requiredSkills: z.array(z.string()).max(20),
  preferredSkills: z.array(z.string()).max(20),
  keyResponsibilities: z.array(z.string()).max(15),
  ambiguities: z.array(z.object({...})).max(10),
  unrealisticExpectations: z.array(z.object({...})).max(10),
  missingCriteria: z.array(z.object({...})).max(10),
  
  // New v2 fields
  department: z.string().max(100),
  location: z.enum(['REMOTE', 'HYBRID', 'ONSITE']),
  salaryMin: z.number().min(0).optional(),
  salaryMax: z.number().min(0).optional(),
}).strict();

// 2. Migration function
export function migrateV1ToV2(v1Data: JDExtraction): JDExtraction_v2 {
  return {
    ...v1Data,
    department: v1Data.department || 'Engineering',
    location: 'REMOTE', // Default for migrated data
    salaryMin: undefined,
    salaryMax: undefined,
  };
}
```

This approach ensures existing evaluations continue working while enabling new features for future data.
