/**
 * Markdown documentation exporter for ArchiMate models
 * Generates comprehensive markdown documentation with optional Mermaid diagrams
 */

import type {
  ArchiMateModel,
  ArchiMateElement,
  ArchiMateRelationship,
  ArchiMateFolder,
  ArchiMateDiagram,
  Layer,
  ElementType,
} from '../model/types.js';
import { getLayerForElementType } from '../model/types.js';
import { generateMermaid, generateMermaidFromView } from './mermaid-exporter.js';

export interface MarkdownOptions {
  includeViews?: boolean;
  includeDiagrams?: boolean;
  groupByLayer?: boolean;
  includeRelationships?: boolean;
  includeProperties?: boolean;
}

const DEFAULT_OPTIONS: Required<MarkdownOptions> = {
  includeViews: true,
  includeDiagrams: true,
  groupByLayer: true,
  includeRelationships: true,
  includeProperties: false,
};

// Layer display order
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
 * Group elements by type within a layer
 */
function groupElementsByType(elements: ArchiMateElement[]): Map<ElementType, ArchiMateElement[]> {
  const groups = new Map<ElementType, ArchiMateElement[]>();

  for (const element of elements) {
    if (!groups.has(element.type)) {
      groups.set(element.type, []);
    }
    groups.get(element.type)!.push(element);
  }

  return groups;
}

/**
 * Format element type for display (add spaces before capitals)
 */
function formatElementType(type: ElementType): string {
  return type.replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Escape markdown special characters
 */
function escapeMarkdown(text: string): string {
  return text.replace(/([*_`\[\]#])/g, '\\$1');
}

/**
 * Get relationships for an element
 */
function getRelationshipsForElement(
  model: ArchiMateModel,
  elementId: string,
  direction: 'incoming' | 'outgoing' | 'both' = 'both'
): ArchiMateRelationship[] {
  return model.relationships.filter((r) => {
    if (direction === 'outgoing') return r.sourceId === elementId;
    if (direction === 'incoming') return r.targetId === elementId;
    return r.sourceId === elementId || r.targetId === elementId;
  });
}

/**
 * Generate table of contents
 */
function generateTableOfContents(
  layerGroups: Map<Layer, ArchiMateElement[]>,
  hasViews: boolean
): string {
  const lines: string[] = [];
  lines.push('## Table of Contents\n');

  lines.push('- [Overview](#overview)');

  for (const layer of LAYER_ORDER) {
    const elements = layerGroups.get(layer);
    if (elements && elements.length > 0) {
      const anchor = layer.toLowerCase().replace(/\s+/g, '-');
      lines.push(`- [${layer} Layer](#${anchor}-layer)`);
    }
  }

  if (hasViews) {
    lines.push('- [Views](#views)');
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Generate overview section
 */
function generateOverview(model: ArchiMateModel, elements: ArchiMateElement[]): string {
  const lines: string[] = [];
  lines.push('## Overview\n');

  if (model.documentation) {
    lines.push(model.documentation);
    lines.push('');
  }

  lines.push(`- **Elements:** ${elements.length}`);
  lines.push(`- **Relationships:** ${model.relationships.length}`);
  lines.push(`- **Views:** ${model.diagrams.length}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate element documentation
 */
function generateElementDoc(
  element: ArchiMateElement,
  model: ArchiMateModel,
  options: Required<MarkdownOptions>
): string {
  const lines: string[] = [];

  lines.push(`#### ${escapeMarkdown(element.name)}\n`);

  if (element.documentation) {
    lines.push(element.documentation);
    lines.push('');
  }

  // Include properties if enabled
  if (options.includeProperties && element.properties && element.properties.length > 0) {
    lines.push('**Properties:**\n');
    for (const prop of element.properties) {
      lines.push(`- ${escapeMarkdown(prop.key)}: ${escapeMarkdown(prop.value)}`);
    }
    lines.push('');
  }

  // Include relationships if enabled
  if (options.includeRelationships) {
    const relationships = getRelationshipsForElement(model, element.id);
    if (relationships.length > 0) {
      lines.push('**Relationships:**\n');

      // Outgoing relationships
      const outgoing = relationships.filter((r) => r.sourceId === element.id);
      for (const rel of outgoing) {
        const target = getElementById(model, rel.targetId);
        if (target) {
          const relName = rel.name ? ` "${escapeMarkdown(rel.name)}"` : '';
          lines.push(`- ${rel.type}${relName} -> ${escapeMarkdown(target.name)}`);
        }
      }

      // Incoming relationships
      const incoming = relationships.filter((r) => r.targetId === element.id);
      for (const rel of incoming) {
        const source = getElementById(model, rel.sourceId);
        if (source) {
          const relName = rel.name ? ` "${escapeMarkdown(rel.name)}"` : '';
          lines.push(`- ${escapeMarkdown(source.name)} -> ${rel.type}${relName}`);
        }
      }

      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Generate layer section
 */
function generateLayerSection(
  layer: Layer,
  elements: ArchiMateElement[],
  model: ArchiMateModel,
  options: Required<MarkdownOptions>
): string {
  const lines: string[] = [];

  lines.push(`## ${layer} Layer\n`);

  // Group elements by type
  const typeGroups = groupElementsByType(elements);
  const sortedTypes = Array.from(typeGroups.keys()).sort();

  for (const type of sortedTypes) {
    const typeElements = typeGroups.get(type)!;
    lines.push(`### ${formatElementType(type)}s\n`);

    for (const element of typeElements) {
      lines.push(generateElementDoc(element, model, options));
    }
  }

  return lines.join('\n');
}

/**
 * Generate views section
 */
function generateViewsSection(
  model: ArchiMateModel,
  options: Required<MarkdownOptions>
): string {
  const lines: string[] = [];

  lines.push('## Views\n');

  for (const diagram of model.diagrams) {
    lines.push(`### ${escapeMarkdown(diagram.name)}\n`);

    if (diagram.viewpoint) {
      lines.push(`**Viewpoint:** ${diagram.viewpoint}\n`);
    }

    if (diagram.documentation) {
      lines.push(diagram.documentation);
      lines.push('');
    }

    // Include Mermaid diagram if enabled
    if (options.includeDiagrams && diagram.objects.length > 0) {
      try {
        const mermaid = generateMermaidFromView(model, diagram.id, {
          direction: 'TB',
          includeRelationshipLabels: true,
        });
        lines.push('```mermaid');
        lines.push(mermaid);
        lines.push('```');
        lines.push('');
      } catch {
        // If view generation fails, skip the diagram
      }
    }

    // List elements in the view
    const elementIds = new Set<string>();
    function collectElementIds(objects: typeof diagram.objects): void {
      for (const obj of objects) {
        elementIds.add(obj.elementId);
        if (obj.children) {
          collectElementIds(obj.children);
        }
      }
    }
    collectElementIds(diagram.objects);

    if (elementIds.size > 0) {
      lines.push('**Elements in this view:**\n');
      for (const elementId of elementIds) {
        const element = getElementById(model, elementId);
        if (element) {
          lines.push(`- ${escapeMarkdown(element.name)} (${formatElementType(element.type)})`);
        }
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Generate complete markdown documentation from ArchiMate model
 */
export function generateMarkdown(
  model: ArchiMateModel,
  options: MarkdownOptions = {}
): string {
  const opts: Required<MarkdownOptions> = { ...DEFAULT_OPTIONS, ...options };
  const lines: string[] = [];

  // Title
  lines.push(`# ${escapeMarkdown(model.name)}\n`);

  // Get all elements
  const elements = getAllElements(model);

  // Group elements by layer
  const layerGroups = groupElementsByLayer(elements);

  // Table of contents
  const hasViews = opts.includeViews && model.diagrams.length > 0;
  lines.push(generateTableOfContents(layerGroups, hasViews));

  // Overview section
  lines.push(generateOverview(model, elements));

  // Layer sections (if groupByLayer is enabled)
  if (opts.groupByLayer) {
    for (const layer of LAYER_ORDER) {
      const layerElements = layerGroups.get(layer);
      if (layerElements && layerElements.length > 0) {
        lines.push(generateLayerSection(layer, layerElements, model, opts));
      }
    }
  } else {
    // Flat list of all elements
    lines.push('## Elements\n');
    for (const element of elements) {
      lines.push(generateElementDoc(element, model, opts));
    }
  }

  // Views section
  if (opts.includeViews && model.diagrams.length > 0) {
    lines.push(generateViewsSection(model, opts));
  }

  // Footer
  lines.push('---');
  lines.push(`*Generated from ArchiMate model: ${escapeMarkdown(model.name)}*`);

  return lines.join('\n');
}

/**
 * Save markdown documentation to file
 */
export async function saveMarkdown(
  model: ArchiMateModel,
  outputPath: string,
  options: MarkdownOptions = {}
): Promise<void> {
  const fs = await import('fs/promises');
  const markdown = generateMarkdown(model, options);
  await fs.writeFile(outputPath, markdown, 'utf-8');
}
