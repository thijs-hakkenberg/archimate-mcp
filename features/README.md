# Feature Specifications

This directory holds Gherkin `.feature` files documenting every observable behavior the MCP server exposes. They are the **single source of truth for what the server does** from a caller's perspective.

## Why these exist

- A reader (LLM agent, contributor, reviewer) can scan one directory and see what the server promises to do, without reading TypeScript.
- The act of writing the scenario forces the implementer to nail down inputs, outputs, and edge cases before code lands.
- When behavior drifts from the spec, the spec gets updated in the same change — so the spec never silently rots.

## Scope

These files are **executable specs**. Each `.feature` is paired with a sibling `<area>.feature.test.ts` that binds its scenarios to step implementations via [`@amiceli/vitest-cucumber`](https://vitest-cucumber.miceli.click/). They run as part of `npm test` and the runner fails if any scenario lacks a binding — keeping spec and test in lockstep.

The vitest unit tests under `src/` remain in place; both layers run together.

## File organization

One `.feature` per cohesive feature area, not per tool. The current areas:

| File | Covers | Wired |
|---|---|---|
| [`view-construction.feature`](view-construction.feature) | Diagram views, adding elements, auto-drawn connections | ✅ |
| [`model-management.feature`](model-management.feature) | Creating, opening, and saving models | — |
| [`element-creation.feature`](element-creation.feature) | Layer-specific element creation, update, delete | — |
| [`relationship-management.feature`](relationship-management.feature) | Creating relationships with ArchiMate 3.2 validation | — |
| [`navigation-and-search.feature`](navigation-and-search.feature) | Listing, finding, and inspecting elements and relationships | — |
| [`impact-analysis.feature`](impact-analysis.feature) | Dependency and impact traversal | — |
| [`exchange-format.feature`](exchange-format.feature) | ArchiMate Open Exchange Format import/export | — |
| [`export-rendering.feature`](export-rendering.feature) | Mermaid, SVG/PNG, Markdown, and HTML deck export | — |
| [`audit-logging.feature`](audit-logging.feature) | Audit log configuration and reading | — |

Unwired files document the intended behavior but do not yet enforce it through tests. Wiring them is incremental work — see the runner pattern in `view-construction.feature.test.ts` for the template.

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
