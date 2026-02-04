/**
 * Mermaid diagram exporter for ArchiMate models
 * Generates Mermaid flowchart/graph syntax from ArchiMate models
 */

import type {
  ArchiMateModel,
  ArchiMateElement,
  ArchiMateRelationship,
  ArchiMateFolder,
  DiagramObject,
  Layer,
} from '../model/types.js';
import { getLayerForElementType } from '../model/types.js';

export interface MermaidOptions {
  diagramType?: 'flowchart' | 'graph';
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
  includeRelationshipLabels?: boolean;
  layerFilter?: string[];
  viewId?: string;
}

const DEFAULT_OPTIONS: Required<Omit<MermaidOptions, 'layerFilter' | 'viewId'>> = {
  diagramType: 'flowchart',
  direction: 'TB',
  includeRelationshipLabels: false,
};

// Layer display order for subgraphs (top to bottom)
const LAYER_ORDER: Layer[] = [
  'Motivation',
  'Strategy',
  'Business',
  'Application',
  'Technology',
  'Physical',
  'Implementation',
  'Composite',
];

// Layer colors for styling hints in comments
const LAYER_COLORS: Record<Layer, string> = {
  Motivation: '#CCCCFF',
  Strategy: '#F5DEAA',
  Business: '#FFFFB5',
  Application: '#B5FFFF',
  Technology: '#C9E7B7',
  Physical: '#C9E7B7',
  Implementation: '#FFE0E0',
  Composite: '#FFFFFF',
};

/**
 * Escape special characters for Mermaid labels
 */
function escapeLabel(text: string): string {
  return text
    .replace(/"/g, "'")
    .replace(/&/g, 'and')
    .replace(/</g, '(')
    .replace(/>/g, ')')
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')');
}

/**
 * Generate a safe node ID from element ID
 */
function toNodeId(elementId: string): string {
  // Mermaid node IDs can't start with numbers or have certain characters
  return elementId.replace(/-/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * Get all elements from all folders in the model
 */
function getAllElements(model: ArchiMateModel): ArchiMateElement[] {
  const elements: ArchiMateElement[] = [];

  function collectFromFolder(folder: ArchiMateFolder): void {
    elements.push(...folder.elements);
    folder.subfolders.forEach(collectFromFolder);
  }

  model.folders.forEach(collectFromFolder);
  return elements;
}

/**
 * Get element by ID from model
 */
function getElementById(model: ArchiMateModel, id: string): ArchiMateElement | undefined {
  return getAllElements(model).find((e) => e.id === id);
}

/**
 * Group elements by layer
 */
function groupElementsByLayer(elements: ArchiMateElement[]): Map<Layer, ArchiMateElement[]> {
  const groups = new Map<Layer, ArchiMateElement[]>();

  for (const element of elements) {
    const layer = getLayerForElementType(element.type);
    if (!groups.has(layer)) {
      groups.set(layer, []);
    }
    groups.get(layer)!.push(element);
  }

  return groups;
}

/**
 * Generate Mermaid arrow syntax based on relationship type
 */
function getArrowForRelationship(
  rel: ArchiMateRelationship,
  includeLabel: boolean
): string {
  const label = includeLabel ? `|${rel.name || rel.type}|` : '';

  // Use different arrow styles based on relationship type
  switch (rel.type) {
    case 'Composition':
      return `--o${label}`;
    case 'Aggregation':
      return `--o${label}`;
    case 'Assignment':
      return `-->${label}`;
    case 'Realization':
      return `-.${label}->`;
    case 'Serving':
      return `-->${label}`;
    case 'Access':
      return `-.${label}->`;
    case 'Influence':
      return `-.${label}->`;
    case 'Association':
      return `---${label}`;
    case 'Triggering':
      return `-->${label}`;
    case 'Flow':
      return `-->${label}`;
    case 'Specialization':
      return `-->${label}`;
    default:
      return `-->${label}`;
  }
}

/**
 * Generate Mermaid diagram from ArchiMate model
 */
export function generateMermaid(
  model: ArchiMateModel,
  options: MermaidOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const lines: string[] = [];

  // Diagram header
  lines.push(`${opts.diagramType} ${opts.direction}`);

  // Get all elements and filter by layer if specified
  let elements = getAllElements(model);
  const elementIds = new Set<string>();

  if (opts.layerFilter && opts.layerFilter.length > 0) {
    const filterLayers = new Set(opts.layerFilter);
    elements = elements.filter((e) => {
      const layer = getLayerForElementType(e.type);
      return filterLayers.has(layer);
    });
  }

  elements.forEach((e) => elementIds.add(e.id));

  // Group elements by layer
  const layerGroups = groupElementsByLayer(elements);

  // Generate subgraphs for each layer (in order)
  for (const layer of LAYER_ORDER) {
    const layerElements = layerGroups.get(layer);
    if (!layerElements || layerElements.length === 0) continue;

    lines.push(`    subgraph ${layer}["${layer} Layer"]`);
    lines.push(`        style ${layer} fill:${LAYER_COLORS[layer]}`);

    for (const element of layerElements) {
      const nodeId = toNodeId(element.id);
      const label = escapeLabel(element.name);
      lines.push(`        ${nodeId}["${label}"]`);
    }

    lines.push('    end');
  }

  // Filter relationships to only include ones between included elements
  const relationships = model.relationships.filter(
    (r) => elementIds.has(r.sourceId) && elementIds.has(r.targetId)
  );

  // Generate relationship connections
  for (const rel of relationships) {
    const sourceId = toNodeId(rel.sourceId);
    const targetId = toNodeId(rel.targetId);
    const arrow = getArrowForRelationship(rel, opts.includeRelationshipLabels ?? false);

    lines.push(`    ${sourceId} ${arrow} ${targetId}`);
  }

  return lines.join('\n');
}

/**
 * Generate Mermaid diagram from a specific view in the model
 */
export function generateMermaidFromView(
  model: ArchiMateModel,
  viewId: string,
  options: Omit<MermaidOptions, 'viewId' | 'layerFilter'> = {}
): string {
  const view = model.diagrams.find((d) => d.id === viewId);
  if (!view) {
    throw new Error(`View not found: ${viewId}`);
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const lines: string[] = [];

  // Diagram header
  lines.push(`${opts.diagramType} ${opts.direction}`);

  // Collect element IDs from the view
  const viewElementIds = new Set<string>();
  const diagramObjectMap = new Map<string, string>(); // elementId -> diagramObjectId

  function collectElementIds(objects: DiagramObject[]): void {
    for (const obj of objects) {
      viewElementIds.add(obj.elementId);
      diagramObjectMap.set(obj.elementId, obj.id);
      if (obj.children) {
        collectElementIds(obj.children);
      }
    }
  }

  collectElementIds(view.objects);

  // Get elements that are in the view
  const elements = getAllElements(model).filter((e) => viewElementIds.has(e.id));

  // Group elements by layer for subgraphs
  const layerGroups = groupElementsByLayer(elements);

  // Generate subgraphs for each layer
  for (const layer of LAYER_ORDER) {
    const layerElements = layerGroups.get(layer);
    if (!layerElements || layerElements.length === 0) continue;

    lines.push(`    subgraph ${layer}["${layer} Layer"]`);
    lines.push(`        style ${layer} fill:${LAYER_COLORS[layer]}`);

    for (const element of layerElements) {
      const nodeId = toNodeId(element.id);
      const label = escapeLabel(element.name);
      lines.push(`        ${nodeId}["${label}"]`);
    }

    lines.push('    end');
  }

  // Get relationship IDs from view connections
  const viewRelationshipIds = new Set<string>();

  function collectConnections(objects: DiagramObject[]): void {
    for (const obj of objects) {
      if (obj.sourceConnections) {
        for (const conn of obj.sourceConnections) {
          viewRelationshipIds.add(conn.relationshipId);
        }
      }
      if (obj.children) {
        collectConnections(obj.children);
      }
    }
  }

  collectConnections(view.objects);

  // Filter relationships to only those in the view
  const relationships = model.relationships.filter(
    (r) => viewRelationshipIds.has(r.id) && viewElementIds.has(r.sourceId) && viewElementIds.has(r.targetId)
  );

  // Generate relationship connections
  for (const rel of relationships) {
    const sourceId = toNodeId(rel.sourceId);
    const targetId = toNodeId(rel.targetId);
    const arrow = getArrowForRelationship(rel, opts.includeRelationshipLabels ?? false);

    lines.push(`    ${sourceId} ${arrow} ${targetId}`);
  }

  return lines.join('\n');
}
