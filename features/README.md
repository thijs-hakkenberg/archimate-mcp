# Feature Specifications

This directory holds Gherkin `.feature` files documenting every observable behavior the MCP server exposes. They are the **single source of truth for what the server does** from a caller's perspective.

## Why these exist

- A reader (LLM agent, contributor, reviewer) can scan one directory and see what the server promises to do, without reading TypeScript.
- The act of writing the scenario forces the implementer to nail down inputs, outputs, and edge cases before code lands.
- When behavior drifts from the spec, the spec gets updated in the same change — so the spec never silently rots.

## Scope

The files in this directory are **documentation-only**. There is no cucumber runner; the executable test of record remains vitest under `src/`. Adding cucumber-js later is a deliberate decision, not a default.

## File organization

One `.feature` per cohesive feature area, not per tool. The current areas:

| File | Covers |
|---|---|
| [`model-management.feature`](model-management.feature) | Creating, opening, and saving models |
| [`element-creation.feature`](element-creation.feature) | Layer-specific element creation, update, delete |
| [`relationship-management.feature`](relationship-management.feature) | Creating relationships with ArchiMate 3.2 validation |
| [`view-construction.feature`](view-construction.feature) | Diagram views, adding elements, auto-drawn connections |
| [`navigation-and-search.feature`](navigation-and-search.feature) | Listing, finding, and inspecting elements and relationships |
| [`impact-analysis.feature`](impact-analysis.feature) | Dependency and impact traversal |
| [`exchange-format.feature`](exchange-format.feature) | ArchiMate Open Exchange Format import/export |
| [`export-rendering.feature`](export-rendering.feature) | Mermaid, SVG/PNG, Markdown, and HTML deck export |
| [`audit-logging.feature`](audit-logging.feature) | Audit log configuration and reading |

Add a new file when a new feature area appears. Keep tool-level scenarios within their area; do not create per-tool files.

## Writing conventions

- Use standard Gherkin: `Feature` → optional `Background` → one or more `Scenario` (or `Scenario Outline` with `Examples`).
- Phrase steps in terms of **MCP tool calls and tool responses**, not internal types or files. The audience is a caller, not an implementer.
- One behavior per scenario. If a scenario needs more than ~6 steps, split it.
- Prefer concrete names (`"Customer"`, `"Order Service"`) over `"foo"`/`"bar"` — readers learn the domain at the same time as the behavior.
- Edge cases (validation failures, idempotence, opt-outs) get their own scenarios. Don't bury them in `And` clauses.
- When a scenario describes a multi-step caller flow (create → save → reopen), say so explicitly with `Background` or sequential `Given`s.

## Update discipline

When you change behavior in `src/`, update the matching `.feature` in the same commit (or PR). The CLAUDE.md release/contribution principle is explicit: a behavior change without a matching feature-file update is incomplete.

When fixing a bug, add the scenario for the now-correct behavior. Do not just rely on the regression test in vitest — the spec should describe what the server **does**, including the edge cases that were once broken.
