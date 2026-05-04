/**
 * Helpers for working with diagram views.
 *
 * Mirrors the behavior of the native Archi desktop app: when an element is dragged
 * into a view, any relationship that connects it to an element already on the canvas
 * is auto-drawn as a diagram connection. Callers (e.g. the MCP `add_to_view` handler)
 * do not need to emit `add_connection_to_view` calls for these relationships.
 */

import type {
  ArchiMateDiagram,
  ArchiMateModel,
  DiagramConnection,
  DiagramObject,
} from './types.js';
import { getRelationshipsForElement } from './parser.js';
import { generateId } from './writer.js';

/**
 * Auto-draw diagram connections for relationships between `newObj` and any other
 * diagram object already present in `diagram`. Mutates `diagram.objects` in place,
 * appending to each endpoint's `sourceConnections` / `targetConnectionIds`.
 *
 * Connection orientation always matches the underlying relationship's direction.
 * Relationships that already have a diagram connection in this view (manual or
 * previously auto-drawn) are skipped, so calling this function repeatedly is safe.
 *
 * Returns the list of newly created connections (may be empty).
 */
export function autoConnectDiagramObject(
  model: ArchiMateModel,
  diagram: ArchiMateDiagram,
  newObj: DiagramObject
): DiagramConnection[] {
  const existingRelationshipIds = collectExistingRelationshipIds(diagram);
  const relationships = getRelationshipsForElement(model, newObj.elementId, 'both');
  const created: DiagramConnection[] = [];

  for (const rel of relationships) {
    if (existingRelationshipIds.has(rel.id)) continue;

    const otherElementId = rel.sourceId === newObj.elementId ? rel.targetId : rel.sourceId;
    const peer = diagram.objects.find(
      (o) => o !== newObj && o.elementId === otherElementId
    );
    if (!peer) continue;

    const [sourceObj, targetObj] =
      rel.sourceId === newObj.elementId ? [newObj, peer] : [peer, newObj];

    const connection: DiagramConnection = {
      id: generateId(),
      sourceId: sourceObj.id,
      targetId: targetObj.id,
      relationshipId: rel.id,
    };

    if (!sourceObj.sourceConnections) sourceObj.sourceConnections = [];
    sourceObj.sourceConnections.push(connection);

    if (!targetObj.targetConnectionIds) targetObj.targetConnectionIds = [];
    targetObj.targetConnectionIds.push(connection.id);

    existingRelationshipIds.add(rel.id);
    created.push(connection);
  }

  return created;
}

function collectExistingRelationshipIds(diagram: ArchiMateDiagram): Set<string> {
  const ids = new Set<string>();
  for (const obj of diagram.objects) {
    for (const conn of obj.sourceConnections ?? []) {
      ids.add(conn.relationshipId);
    }
  }
  return ids;
}
