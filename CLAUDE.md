# ArchiMate MCP Server

An MCP server for working with ArchiMate models in coArchi2 repositories.

## Project Commands

- `npm run build` - Build TypeScript to dist/
- `npm test` - Run tests (vitest)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

## Architecture

```
src/
├── index.ts                    # MCP server entry point with 32 tool definitions
├── model/
│   ├── types.ts               # ArchiMate type definitions (59 element types)
│   ├── parser.ts              # coArchi2 XML parser
│   └── writer.ts              # coArchi2 XML writer
├── relationships/
│   └── validation.ts          # ArchiMate 3.2 relationship validation
├── exporters/
│   ├── mermaid-exporter.ts    # Mermaid flowchart generation
│   ├── svg-exporter.ts        # Native SVG/PNG rendering
│   ├── markdown-exporter.ts   # Markdown documentation
│   └── html-deck-exporter.ts  # Interactive HTML presentation
├── exchange/
│   ├── exchange-reader.ts     # ArchiMate Open Exchange import
│   └── exchange-writer.ts     # ArchiMate Open Exchange export
└── audit/
    └── logger.ts              # NDJSON audit logging
```

## Key Concepts

- **coArchi2 Format**: Native format for Archi tool, uses `.archimate` XML files
- **ArchiMate Exchange Format**: Standard XML format (xmlns `http://www.opengroup.org/xsd/archimate/3.0/`)
- **Layers**: Motivation, Strategy, Business, Application, Technology, Physical, Implementation, Composite
- **Relationship Validation**: All relationships validated against ArchiMate 3.2 spec

## Testing

Uses Vitest. Test files are colocated with source in `__tests__/` directories or as `.test.ts` files.

```typescript
import { describe, it, expect } from 'vitest';

describe('feature', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
```

Test fixtures in `src/__tests__/fixtures/`:
- `sample-model.ts` - Factory for creating test models
- `sample-exchange.xml` - Sample ArchiMate exchange format file

## Environment Variables

- `ARCHIMATE_AUDIT_LOG` - Path to audit log file, or "disabled" to turn off logging

## Dependencies

- `sharp` - PNG generation from SVG (optional, only needed for PNG export)
- `fast-xml-parser` - XML parsing/generation for model files

## MCP Resources

The server exposes three resources:
- `archimate://spec/elements` - Element type catalog
- `archimate://spec/relationships` - Relationship type catalog
- `archimate://model/summary` - Current model summary

## Code Style

- Use TypeScript strict mode
- Prefer functional style for data transformations
- Use explicit types for function parameters and returns
- Test-driven development: write tests before implementation
