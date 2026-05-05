/**
 * Impact analysis: walk an element's relationship graph in a chosen direction
 * up to a configured depth and report every element reached.
 *
 * Used by the archimate_impact_analysis MCP tool and by the impact-analysis
 * feature test bindings, so the spec exercises the same code path callers do.
 */

import type { ArchiMateModel } from './types.js';
import { getElementById, getRelationshipsForElement } from './parser.js';

export type ImpactDirection = 'incoming' | 'outgoing' | 'both';

export interface ImpactedElement {
  depth: number;
  direction: 'incoming' | 'outgoing';
  relationship: string;
  elementId: string;
  elementName: string;
  elementType: string;
}

export interface ImpactAnalysisResult {
  rootElement: { id: string; name: string; type: string };
  direction: ImpactDirection;
  maxDepth: number;
  impactedElements: ImpactedElement[];
  totalImpacted: number;
}

export const DEFAULT_IMPACT_DEPTH = 2;
export const DEFAULT_IMPACT_DIRECTION: ImpactDirection = 'both';

export function analyzeImpact(
  model: ArchiMateModel,
  elementId: string,
  direction: ImpactDirection = DEFAULT_IMPACT_DIRECTION,
  maxDepth: number = DEFAULT_IMPACT_DEPTH
): ImpactAnalysisResult | null {
  const rootElement = getElementById(model, elementId);
  if (!rootElement) return null;

  const visited = new Set<string>();
  const impact: ImpactedElement[] = [];

  function analyze(id: string, depth: number): void {
    if (depth > maxDepth || visited.has(id)) return;
    visited.add(id);

    const rels = getRelationshipsForElement(model, id, direction);
    for (const rel of rels) {
      const isSource = rel.sourceId === id;
      const otherId = isSource ? rel.targetId : rel.sourceId;

      if (!visited.has(otherId)) {
        const other = getElementById(model, otherId);
        impact.push({
          depth,
          direction: isSource ? 'outgoing' : 'incoming',
          relationship: rel.type,
          elementId: otherId,
          elementName: other?.name ?? 'Unknown',
          elementType: other?.type ?? 'Unknown',
        });
        analyze(otherId, depth + 1);
      }
    }
  }

  analyze(elementId, 1);

  return {
    rootElement: { id: rootElement.id, name: rootElement.name, type: rootElement.type },
    direction,
    maxDepth,
    impactedElements: impact,
    totalImpacted: impact.length,
  };
}
