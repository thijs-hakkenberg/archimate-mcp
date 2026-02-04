# ADR 001: Use coArchi2 as Primary File Format

## Status

Accepted

## Context

ArchiMate models can be stored in several formats:
1. **coArchi2 format** - Native format for the Archi tool, uses `.archimate` XML files
2. **ArchiMate Open Exchange Format** - Standard XML format defined by The Open Group
3. **Custom/proprietary formats** - Various vendor-specific formats

We needed to choose a primary format for reading and writing ArchiMate models.

## Decision

We chose coArchi2 as the primary file format for the following reasons:

1. **Archi is the most popular free ArchiMate tool** - coArchi2 format is widely used by practitioners
2. **Rich metadata support** - Supports element properties, documentation, and diagram layouts
3. **Git-friendly** - The coArchi2 format is designed for version control with one file per element
4. **Diagram preservation** - Full support for view bounds, nested elements, and connection routing
5. **Bi-directional editing** - Users can edit models in Archi and use this MCP server interchangeably

## Consequences

### Positive
- Seamless integration with Archi tool ecosystem
- Users can visualize models in Archi's GUI
- Model files can be version-controlled with Git
- Full round-trip preservation of all model data

### Negative
- Must maintain compatibility with coArchi2 format changes
- Need to implement a separate importer/exporter for ArchiMate Open Exchange Format

### Mitigation
We implemented `archimate_import_exchange` and `archimate_export_exchange` tools to support the standard ArchiMate Open Exchange Format for interoperability with other tools.
