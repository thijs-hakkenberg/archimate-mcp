/**
 * SVG diagram exporter for ArchiMate models
 * Renders diagram views as SVG with ArchiMate notation
 */

import type {
  ArchiMateModel,
  ArchiMateElement,
  ArchiMateRelationship,
  ArchiMateFolder,
  ArchiMateDiagram,
  DiagramObject,
  DiagramConnection,
  Layer,
  ElementType,
  RelationshipType,
} from '../model/types.js';
import { getLayerForElementType } from '../model/types.js';

export interface DiagramExportOptions {
  format?: 'svg' | 'png';
  width?: number;
  height?: number;
  backgroundColor?: string;
  showLabels?: boolean;
  colorByLayer?: boolean;
  padding?: number;
}

const DEFAULT_OPTIONS: Required<Omit<DiagramExportOptions, 'format' | 'width' | 'height'>> = {
  backgroundColor: '#ffffff',
  showLabels: true,
  colorByLayer: true,
  padding: 20,
};

// ArchiMate layer colors
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

// Relationship line styles
const RELATIONSHIP_STYLES: Record<RelationshipType, { dash?: string; marker: string }> = {
  Composition: { marker: 'diamond-filled' },
  Aggregation: { marker: 'diamond-open' },
  Assignment: { marker: 'arrow' },
  Realization: { dash: '5,3', marker: 'arrow-open' },
  Serving: { marker: 'arrow' },
  Access: { dash: '3,3', marker: 'arrow-open' },
  Influence: { dash: '3,3', marker: 'arrow-open' },
  Association: { marker: 'none' },
  Triggering: { marker: 'arrow-filled' },
  Flow: { marker: 'arrow-filled' },
  Specialization: { marker: 'triangle-open' },
};

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
 * Get fill color for an element based on its layer
 */
function getElementColor(element: ArchiMateElement): string {
  const layer = getLayerForElementType(element.type);
  return LAYER_COLORS[layer];
}

/**
 * Escape text for XML/SVG
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate SVG marker definitions for relationship arrows
 */
function generateMarkerDefs(): string {
  return `
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#333"/>
    </marker>
    <marker id="arrow-open" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L9,3 L0,6" fill="none" stroke="#333" stroke-width="1"/>
    </marker>
    <marker id="arrow-filled" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#333"/>
    </marker>
    <marker id="diamond-filled" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="strokeWidth">
      <path d="M0,6 L6,0 L12,6 L6,12 z" fill="#333"/>
    </marker>
    <marker id="diamond-open" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="strokeWidth">
      <path d="M0,6 L6,0 L12,6 L6,12 z" fill="white" stroke="#333" stroke-width="1"/>
    </marker>
    <marker id="triangle-open" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,10 L9,5 z" fill="white" stroke="#333" stroke-width="1"/>
    </marker>
  </defs>`;
}

/**
 * Generate SVG rectangle for an element
 */
function generateElementRect(
  obj: DiagramObject,
  element: ArchiMateElement,
  options: Required<Omit<DiagramExportOptions, 'format' | 'width' | 'height'>>
): string {
  const { x, y, width, height } = obj.bounds;
  const fillColor = options.colorByLayer ? getElementColor(element) : '#ffffff';

  const lines: string[] = [];

  lines.push(`  <g transform="translate(${x}, ${y})">`);

  // Rectangle with rounded corners
  lines.push(`    <rect width="${width}" height="${height}" rx="3" ry="3" fill="${fillColor}" stroke="#333" stroke-width="1"/>`);

  // Label text
  if (options.showLabels) {
    const label = escapeXml(element.name);
    // Center text in the rectangle
    const textX = width / 2;
    const textY = height / 2 + 4; // Slight offset for vertical centering

    // Truncate long labels
    const maxChars = Math.floor(width / 7);
    const displayLabel = label.length > maxChars ? label.substring(0, maxChars - 2) + '..' : label;

    lines.push(`    <text x="${textX}" y="${textY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#333">${displayLabel}</text>`);
  }

  lines.push('  </g>');

  return lines.join('\n');
}

/**
 * Calculate connection points for a line between two elements
 */
function calculateConnectionPoints(
  sourceObj: DiagramObject,
  targetObj: DiagramObject
): { x1: number; y1: number; x2: number; y2: number } {
  const sourceCenterX = sourceObj.bounds.x + sourceObj.bounds.width / 2;
  const sourceCenterY = sourceObj.bounds.y + sourceObj.bounds.height / 2;
  const targetCenterX = targetObj.bounds.x + targetObj.bounds.width / 2;
  const targetCenterY = targetObj.bounds.y + targetObj.bounds.height / 2;

  // Calculate direction vector
  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;

  // Find intersection points with rectangles
  let x1 = sourceCenterX;
  let y1 = sourceCenterY;
  let x2 = targetCenterX;
  let y2 = targetCenterY;

  // Source edge intersection
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal-ish line
    if (dx > 0) {
      x1 = sourceObj.bounds.x + sourceObj.bounds.width;
      y1 = sourceCenterY + (dy / dx) * (sourceObj.bounds.width / 2);
      x2 = targetObj.bounds.x;
      y2 = targetCenterY - (dy / dx) * (targetObj.bounds.width / 2);
    } else {
      x1 = sourceObj.bounds.x;
      y1 = sourceCenterY - (dy / dx) * (sourceObj.bounds.width / 2);
      x2 = targetObj.bounds.x + targetObj.bounds.width;
      y2 = targetCenterY + (dy / dx) * (targetObj.bounds.width / 2);
    }
  } else {
    // Vertical-ish line
    if (dy > 0) {
      y1 = sourceObj.bounds.y + sourceObj.bounds.height;
      x1 = sourceCenterX + (dx / dy) * (sourceObj.bounds.height / 2);
      y2 = targetObj.bounds.y;
      x2 = targetCenterX - (dx / dy) * (targetObj.bounds.height / 2);
    } else if (dy < 0) {
      y1 = sourceObj.bounds.y;
      x1 = sourceCenterX - (dx / dy) * (sourceObj.bounds.height / 2);
      y2 = targetObj.bounds.y + targetObj.bounds.height;
      x2 = targetCenterX + (dx / dy) * (targetObj.bounds.height / 2);
    }
  }

  return { x1, y1, x2, y2 };
}

/**
 * Generate SVG line for a relationship connection
 */
function generateConnectionLine(
  conn: DiagramConnection,
  sourceObj: DiagramObject,
  targetObj: DiagramObject,
  relationship: ArchiMateRelationship | undefined
): string {
  const { x1, y1, x2, y2 } = calculateConnectionPoints(sourceObj, targetObj);

  const style = relationship ? RELATIONSHIP_STYLES[relationship.type] : RELATIONSHIP_STYLES.Association;
  const dashAttr = style.dash ? ` stroke-dasharray="${style.dash}"` : '';
  const markerAttr = style.marker !== 'none' ? ` marker-end="url(#${style.marker})"` : '';

  return `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#333" stroke-width="1"${dashAttr}${markerAttr}/>`;
}

/**
 * Generate SVG diagram from a view in the ArchiMate model
 */
export function generateSvg(
  model: ArchiMateModel,
  viewId: string,
  options: DiagramExportOptions = {}
): string {
  const view = model.diagrams.find((d) => d.id === viewId);
  if (!view) {
    throw new Error(`View not found: ${viewId}`);
  }

  const opts: Required<Omit<DiagramExportOptions, 'format' | 'width' | 'height'>> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  // Calculate bounds of all objects
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const diagramObjectMap = new Map<string, DiagramObject>();

  function collectBounds(objects: DiagramObject[]): void {
    for (const obj of objects) {
      diagramObjectMap.set(obj.id, obj);
      minX = Math.min(minX, obj.bounds.x);
      minY = Math.min(minY, obj.bounds.y);
      maxX = Math.max(maxX, obj.bounds.x + obj.bounds.width);
      maxY = Math.max(maxY, obj.bounds.y + obj.bounds.height);
      if (obj.children) {
        collectBounds(obj.children);
      }
    }
  }

  collectBounds(view.objects);

  // Handle empty view
  if (minX === Infinity) {
    minX = 0;
    minY = 0;
    maxX = 100;
    maxY = 100;
  }

  // Add padding
  const padding = opts.padding;
  const viewBoxX = minX - padding;
  const viewBoxY = minY - padding;
  const viewBoxWidth = (maxX - minX) + padding * 2;
  const viewBoxHeight = (maxY - minY) + padding * 2;

  // Determine SVG dimensions
  const svgWidth = options.width ?? viewBoxWidth;
  const svgHeight = options.height ?? viewBoxHeight;

  const lines: string[] = [];

  // SVG header
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}">`);

  // Background
  lines.push(`  <rect x="${viewBoxX}" y="${viewBoxY}" width="${viewBoxWidth}" height="${viewBoxHeight}" fill="${opts.backgroundColor}"/>`);

  // Marker definitions
  lines.push(generateMarkerDefs());

  // Collect all connections for rendering later
  const connections: Array<{
    conn: DiagramConnection;
    sourceObj: DiagramObject;
    targetObj: DiagramObject;
    relationship?: ArchiMateRelationship;
  }> = [];

  // Render elements
  function renderObjects(objects: DiagramObject[]): void {
    for (const obj of objects) {
      const element = getElementById(model, obj.elementId);
      if (element) {
        lines.push(generateElementRect(obj, element, opts));
      }

      // Collect connections
      if (obj.sourceConnections) {
        for (const conn of obj.sourceConnections) {
          const targetObj = diagramObjectMap.get(conn.targetId);
          if (targetObj) {
            const relationship = model.relationships.find((r) => r.id === conn.relationshipId);
            connections.push({ conn, sourceObj: obj, targetObj, relationship });
          }
        }
      }

      if (obj.children) {
        renderObjects(obj.children);
      }
    }
  }

  renderObjects(view.objects);

  // Render connections (after elements so lines are behind)
  // Actually, let's insert them before elements for proper layering
  // We need to re-order the output
  const elementLines = lines.splice(4); // Remove everything after defs

  // Add connections first (behind elements)
  for (const { conn, sourceObj, targetObj, relationship } of connections) {
    lines.push(generateConnectionLine(conn, sourceObj, targetObj, relationship));
  }

  // Add elements back
  lines.push(...elementLines);

  // Close SVG
  lines.push('</svg>');

  return lines.join('\n');
}

/**
 * Generate PNG from SVG using sharp
 */
export async function generatePng(
  model: ArchiMateModel,
  viewId: string,
  options: DiagramExportOptions = {}
): Promise<Buffer> {
  const sharp = await import('sharp');
  const svg = generateSvg(model, viewId, options);
  const svgBuffer = Buffer.from(svg);

  return sharp.default(svgBuffer).png().toBuffer();
}

/**
 * Save diagram to file
 */
export async function saveDiagram(
  model: ArchiMateModel,
  viewId: string,
  outputPath: string,
  options: DiagramExportOptions = {}
): Promise<void> {
  const fs = await import('fs/promises');
  const format = options.format ?? (outputPath.endsWith('.png') ? 'png' : 'svg');

  if (format === 'png') {
    const pngBuffer = await generatePng(model, viewId, options);
    await fs.writeFile(outputPath, pngBuffer);
  } else {
    const svg = generateSvg(model, viewId, options);
    await fs.writeFile(outputPath, svg, 'utf-8');
  }
}
