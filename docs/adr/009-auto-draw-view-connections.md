# ADR 009: Auto-Draw Diagram Connections on `archimate_add_to_view`

## Status

Accepted

## Context

Diagram views in ArchiMate models are composed of two layers:

- **Elements** stored in folders, with relationships between them.
- **Diagram objects** placed on a view canvas, plus **diagram connections** (lines/arrows) that visualize specific relationships between specific on-canvas objects.

Until 0.3.0 the MCP exposed these as two independent tools:

- `archimate_add_to_view(view_id, element_id, …)` — places the element on the canvas.
- `archimate_add_connection_to_view(view_id, relationship_id, source_diagram_object_id, target_diagram_object_id)` — draws a single line between two diagram objects.

Drawing a line therefore required four IDs (view, relationship, and both diagram-object IDs) and a separate tool call per edge. Field reports showed agents routinely produced views with missing or malformed lines: skipped connection calls, mis-oriented source/target, and references to the wrong diagram-object IDs were the dominant failure modes. The native Archi desktop app does not have this problem because dragging an element onto a view auto-draws every connection to elements already present.

Options considered:

1. **Status quo** — keep both tools and improve the description of `archimate_add_connection_to_view` to nudge agents toward correct usage.
2. **Auto-draw on add_to_view** — when an element is added, scan for relationships between it and any element already on the canvas and create the corresponding diagram connections automatically.
3. **Bulk add tool** — a new `archimate_add_to_view_bulk(view_id, element_ids[])` that adds many elements and draws all internal edges in one call.

## Decision

We chose **auto-draw on add_to_view** (option 2).

Implementation (`src/model/view-helpers.ts`):

- After a new diagram object is appended to `view.objects`, `autoConnectDiagramObject` walks `model.relationships` for any relationship where the new element is one endpoint and a sibling diagram object covers the other endpoint.
- For each match it creates a `DiagramConnection`, preserving the relationship's source→target orientation, and dedupes against any pre-existing diagram connection for that relationship in the view.
- The handler returns the list as `autoConnectedRelationships` so callers see what was drawn.

A new boolean parameter `auto_connect` (default `true`) lets callers suppress the behavior. The `archimate_add_connection_to_view` tool is retained but redocumented as a manual override for the rare cases where it is still useful (for example, restoring a connection after a deliberate `auto_connect: false` add).

We rejected the bulk tool because it does not address the underlying problem (agents still have to know which edges exist) and because it would proliferate the tool surface.

## Consequences

### Positive

- Views built by an agent now match what a human would produce by dragging elements into Archi: every relationship between on-canvas elements is rendered, oriented correctly, and rendered without manual coordinate work.
- The most common agent failure mode (missing or wrong-direction lines) is eliminated by construction rather than by hoping a description nudge lands.
- Fewer MCP round-trips per view. A three-element triangle that previously needed three add and three connect calls now needs three add calls.
- The tool surface stays the same size; no new tools to document or maintain.

### Negative

- The default behavior changes silently. Any caller that previously relied on `add_to_view` not creating connections — for example, a workflow that adds elements first and then explicitly draws connections to control bendpoints — must now pass `auto_connect: false`. This is documented in the tool description and the 0.3.0 CHANGELOG entry.
- Auto-drawn connections have no bendpoints, matching Archi's drag behavior. Callers who want routed lines must still call `archimate_add_connection_to_view` (after disabling auto-draw) and supply bendpoints manually.
- The helper performs an O(R) scan of all model relationships per add, where R is the relationship count. Acceptable for the model sizes this server is intended for; if very large models become common the scan can be replaced with an indexed lookup.

### Verification

`src/model/view-helpers.test.ts` covers seven scenarios: empty view, outgoing-direction draw, incoming-direction draw, three-element triangle dedup, repeat-call dedup, manual-connection dedup, and orphan-element no-op. End-to-end smoke during the 0.3.0 release confirmed that the saved `.archimate` XML contains the expected `<sourceConnection>` elements and `targetConnections` attributes, and that the SVG exporter renders the auto-drawn arrows.
