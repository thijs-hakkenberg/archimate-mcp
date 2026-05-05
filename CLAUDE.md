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
├── index.ts                    # MCP server entry point with 33 tool definitions
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

## Installation

Recommended install for Claude Code (auto-updates):
```bash
claude mcp add archimate -- npx -y archimate-mcp-server@latest
```

## Releasing

Publishes are automated via `.github/workflows/publish.yml` (triggered by any `v*` tag). Auth uses **npm OIDC trusted publishing** — no `NPM_TOKEN` secret is involved; the workflow exchanges its GitHub OIDC token for short-lived publish credentials. Provenance is signed automatically.

Procedure (commit directly to `main` — no PR needed for a release bump):

1. Pick the next version per [semver](https://semver.org/): `MAJOR.MINOR.PATCH`. Backwards-compatible feature → bump MINOR; bug fix → bump PATCH; breaking change → bump MAJOR.
2. Update `package.json` `version` and run `npm install --package-lock-only` to sync `package-lock.json`.
3. In `CHANGELOG.md`, rename the `[Unreleased]` heading to `[X.Y.Z] - YYYY-MM-DD`, group entries under `### Added` / `### Changed` / `### Fixed` / `### Removed`, and add a fresh empty `[Unreleased]` heading above. Add the new compare link at the bottom (`[X.Y.Z]: .../compare/vPREV...vX.Y.Z`) and update the `[Unreleased]` link to compare against the new tag.
4. Commit: `chore: release X.Y.Z` (one-line summary of what's in it is fine in the body).
5. `git push origin main`.
6. Tag and push: `git tag vX.Y.Z && git push origin vX.Y.Z`.
7. The workflow runs `npm ci`, `npm run build`, `npm test`, then `npm publish --provenance --access public`. Watch with `gh run watch`. If it fails before publish (build/tests), fix forward, force-update the tag (`git tag -f vX.Y.Z <sha> && git push -f origin vX.Y.Z`) only if nothing was published yet — npm versions are immutable once accepted.

Verify after success: `npm view archimate-mcp-server version` should return `X.Y.Z`. Existing `npx -y archimate-mcp-server@latest` users auto-pick it up.

## Behavior Documentation

**Principle**: every observable behavior of the MCP server is documented in a Gherkin `.feature` file under `features/`. This is non-negotiable. When you add, change, or remove behavior, update the relevant `.feature` file in the same change — not later.

- Files are grouped by feature area, not by tool. See `features/README.md` for the area map and writing conventions.
- Feature files are wired to vitest via `@amiceli/vitest-cucumber`. Each `.feature` file has a sibling `<area>.feature.test.ts` that binds every scenario to step implementations and runs as part of `npm test`. The runner enforces 1:1 coverage — a scenario without bindings fails the suite.
- A behavior change without a matching `.feature` update is incomplete. Reviewers should reject PRs that skip this.
- Bug fixes that reveal previously-unspecified behavior should add a scenario for the now-correct behavior, not just a regression test.
- When you add or rename a scenario, update its step bindings in the same change. The runner will tell you if you forget.

## Code Style

- Use TypeScript strict mode
- Prefer functional style for data transformations
- Use explicit types for function parameters and returns
- Test-driven development: write tests before implementation
