# ADR 002: Native SVG Rendering Without External Services

## Status

Accepted

## Context

We needed to generate visual diagrams (SVG and PNG) from ArchiMate views. Several approaches were considered:

1. **PlantUML** - External service or local JAR, generates diagrams from text
2. **Mermaid** - JavaScript library, primarily for flowcharts
3. **D3.js** - General-purpose visualization library
4. **Native SVG generation** - Direct SVG XML construction in TypeScript

## Decision

We chose native SVG rendering (generating SVG XML directly in TypeScript) for the following reasons:

1. **No external dependencies** - No Java runtime, no external services required
2. **Full control** - Precise positioning using DiagramObject bounds from the model
3. **ArchiMate notation** - Can implement proper ArchiMate visual notation
4. **Fast execution** - No network calls or process spawning
5. **Deterministic output** - Same input always produces identical output

For PNG generation, we use the `sharp` library to convert SVG to PNG.

## Consequences

### Positive
- Zero external runtime dependencies (except optional `sharp` for PNG)
- Predictable, fast diagram generation
- Complete control over visual styling
- Works offline

### Negative
- Must implement ArchiMate notation shapes ourselves
- More code to maintain than using an external library
- Limited to basic rendering (no advanced layout algorithms)

### Implementation Details

The SVG exporter (`src/exporters/svg-exporter.ts`):
- Reads element positions from `DiagramObject.bounds`
- Colors elements by layer (Business=yellow, Application=blue, etc.)
- Renders relationship lines with appropriate arrow markers
- Generates viewBox based on diagram extent
- Uses `sharp` library for PNG conversion when requested
