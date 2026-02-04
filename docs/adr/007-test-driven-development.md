# ADR 007: Test-Driven Development with Vitest

## Status

Accepted

## Context

When implementing the export features (Mermaid, SVG, Markdown, HTML deck, Exchange format), we needed a testing strategy. Options considered:

1. **No tests** - Manual testing only
2. **Post-implementation testing** - Write tests after code
3. **Test-Driven Development (TDD)** - Write tests before implementation
4. **Behavior-Driven Development (BDD)** - Specification-driven testing

## Decision

We chose Test-Driven Development with Vitest:

1. **Write failing tests first** - Define expected behavior before implementation
2. **Implement minimum code** - Make tests pass with simplest solution
3. **Refactor** - Clean up while keeping tests green

Testing framework: **Vitest** was chosen over Jest for:
- Native TypeScript support
- Faster execution
- Modern ESM support
- Compatible API with Jest

## Consequences

### Positive
- High test coverage (122+ tests)
- Clear specification of expected behavior
- Confidence in refactoring
- Documentation through tests
- Catches regressions early

### Negative
- Initial development takes longer
- Tests must be maintained alongside code
- Some tests may be brittle (snapshot tests)

### Test Structure

```
src/
├── __tests__/
│   ├── fixtures/
│   │   ├── sample-model.ts      # Test model factory
│   │   └── sample-exchange.xml  # Sample files
│   ├── exporters/
│   │   ├── mermaid-exporter.test.ts
│   │   ├── svg-exporter.test.ts
│   │   ├── markdown-exporter.test.ts
│   │   └── html-deck-exporter.test.ts
│   ├── exchange/
│   │   ├── exchange-reader.test.ts
│   │   └── exchange-writer.test.ts
│   └── audit/
│       └── logger.test.ts
```

### Test Examples

```typescript
describe('mermaid-exporter', () => {
  it('should generate valid flowchart syntax', () => {
    const model = createTestModel();
    const result = generateMermaid(model);
    expect(result).toContain('flowchart TB');
  });
});
```
