# ADR 004: ArchiMate 3.2 Specification Compliance

## Status

Accepted

## Context

ArchiMate is a standardized enterprise architecture modeling language. The specification defines:
- 59 element types across 8 layers
- 11 relationship types with specific validity rules
- Viewpoint definitions

We needed to decide how strictly to enforce specification compliance.

## Decision

We chose full ArchiMate 3.2 specification compliance with helpful error messages:

1. **All 59 element types supported** - Complete coverage of Motivation, Strategy, Business, Application, Technology, Physical, Implementation, and Composite layers

2. **Strict relationship validation** - Every relationship is validated against the specification's allowed source-target combinations

3. **Helpful error suggestions** - When an invalid relationship is attempted, the error message suggests valid alternatives

Example error:
```
Error: Assignment is not a valid relationship between DataObject and BusinessActor
Suggestions: Realization, Serving, Association, Flow
```

## Consequences

### Positive
- Models are guaranteed to be valid ArchiMate
- Prevents common modeling mistakes
- Educational - helps users learn valid patterns
- Tool interoperability - exported models work in other ArchiMate tools

### Negative
- More restrictive than some tools that allow "creative" modeling
- Must update when ArchiMate spec changes
- Validation logic is complex (relationship validity matrix)

### Implementation Details

The relationship validation (`src/relationships/validation.ts`):
- Contains the complete relationship validity matrix from the spec
- Validates at relationship creation time
- Provides `archimate_get_valid_relationships` tool for querying valid combinations
- Returns specific suggestions when validation fails
