/**
 * ArchiMate Open Exchange Format Reader
 * Parses ArchiMate 3.x exchange format XML files
 */

import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs/promises';
import type {
  ArchiMateModel,
  ArchiMateFolder,
  ArchiMateElement,
  ArchiMateRelationship,
  ArchiMateDiagram,
  DiagramObject,
  DiagramConnection,
  ElementType,
  RelationshipType,
  Layer,
} from '../model/types.js';
import { AllElementTypes, RelationshipTypes, getLayerForElementType, LayerFolderTypes } from '../model/types.js';

// Parser configuration
const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true,
  trimValues: true,
};

// Helper to ensure array
function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

// Get text content from potentially localized element
function getText(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    // Handle xml:lang format: { '@_xml:lang': 'en', '#text': 'value' }
    if ('#text' in obj) return String(obj['#text']);
    // Handle direct value
    return String(value);
  }
  return String(value);
}

// Map exchange type to internal type
function mapElementType(exchangeType: string): ElementType | null {
  // Exchange format uses simple type names without namespace
  // e.g., "BusinessActor" not "archimate:BusinessActor"
  const type = exchangeType as ElementType;
  if (AllElementTypes.includes(type as never)) {
    return type;
  }
  return null;
}

// Map exchange relationship type to internal type
function mapRelationshipType(exchangeType: string): RelationshipType | null {
  // Exchange format uses simple names like "Assignment", "Serving", etc.
  // Remove "Relationship" suffix if present
  let type = exchangeType.replace(/Relationship$/, '');
  if (RelationshipTypes.includes(type as never)) {
    return type as RelationshipType;
  }
  return null;
}

// Create folder structure for elements
function createFolderStructure(): ArchiMateFolder[] {
  return [
    { id: 'folder-motivation', name: 'Motivation', type: 'motivation', elements: [], subfolders: [] },
    { id: 'folder-strategy', name: 'Strategy', type: 'strategy', elements: [], subfolders: [] },
    { id: 'folder-business', name: 'Business', type: 'business', elements: [], subfolders: [] },
    { id: 'folder-application', name: 'Application', type: 'application', elements: [], subfolders: [] },
    { id: 'folder-technology', name: 'Technology & Physical', type: 'technology', elements: [], subfolders: [] },
    { id: 'folder-implementation', name: 'Implementation & Migration', type: 'implementation_migration', elements: [], subfolders: [] },
    { id: 'folder-other', name: 'Other', type: 'other', elements: [], subfolders: [] },
    { id: 'folder-relations', name: 'Relations', type: 'relations', elements: [], subfolders: [] },
    { id: 'folder-diagrams', name: 'Views', type: 'diagrams', elements: [], subfolders: [] },
  ];
}

// Get folder for element type
function getFolderForType(folders: ArchiMateFolder[], elementType: ElementType): ArchiMateFolder {
  const layer = getLayerForElementType(elementType);
  const folderType = LayerFolderTypes[layer];
  return folders.find((f) => f.type === folderType) || folders.find((f) => f.type === 'other')!;
}

// Parse element from exchange format
function parseElement(elementNode: Record<string, unknown>): ArchiMateElement | null {
  const id = String(elementNode['@_identifier'] || '');
  const typeAttr = String(elementNode['@_xsi:type'] || elementNode['@_type'] || '');
  const elementType = mapElementType(typeAttr);

  if (!elementType) {
    return null;
  }

  return {
    id,
    type: elementType,
    name: getText(elementNode['name']),
    documentation: getText(elementNode['documentation']) || undefined,
    properties: [],
  };
}

// Parse relationship from exchange format
function parseRelationship(relNode: Record<string, unknown>): ArchiMateRelationship | null {
  const id = String(relNode['@_identifier'] || '');
  const typeAttr = String(relNode['@_xsi:type'] || relNode['@_type'] || '');
  const relType = mapRelationshipType(typeAttr);

  if (!relType) {
    return null;
  }

  return {
    id,
    type: relType,
    sourceId: String(relNode['@_source'] || ''),
    targetId: String(relNode['@_target'] || ''),
    name: getText(relNode['name']) || undefined,
    documentation: getText(relNode['documentation']) || undefined,
    properties: [],
  };
}

// Parse diagram object (node) from exchange format
function parseDiagramObject(nodeData: Record<string, unknown>): DiagramObject {
  const id = String(nodeData['@_identifier'] || '');
  const elementId = String(nodeData['@_elementRef'] || '');

  // Parse bounds
  const x = Number(nodeData['@_x']) || 0;
  const y = Number(nodeData['@_y']) || 0;
  const width = Number(nodeData['@_w']) || 120;
  const height = Number(nodeData['@_h']) || 55;

  return {
    id,
    elementId,
    bounds: { x, y, width, height },
    sourceConnections: [],
    children: [],
  };
}

// Parse diagram connection from exchange format
function parseConnection(connData: Record<string, unknown>): DiagramConnection {
  return {
    id: String(connData['@_identifier'] || ''),
    sourceId: String(connData['@_source'] || ''),
    targetId: String(connData['@_target'] || ''),
    relationshipId: String(connData['@_relationshipRef'] || ''),
  };
}

// Parse view/diagram from exchange format
function parseDiagram(viewData: Record<string, unknown>): ArchiMateDiagram {
  const id = String(viewData['@_identifier'] || '');
  const name = getText(viewData['name']);
  const viewpoint = String(viewData['@_viewpoint'] || '') || undefined;
  const documentation = getText(viewData['documentation']) || undefined;

  // Parse nodes
  const nodeList = ensureArray(viewData['node']);
  const objects: DiagramObject[] = [];
  const connectionMap = new Map<string, DiagramConnection[]>();

  for (const nodeData of nodeList) {
    if (typeof nodeData === 'object' && nodeData !== null) {
      objects.push(parseDiagramObject(nodeData as Record<string, unknown>));
    }
  }

  // Parse connections
  const connectionList = ensureArray(viewData['connection']);
  for (const connData of connectionList) {
    if (typeof connData === 'object' && connData !== null) {
      const conn = parseConnection(connData as Record<string, unknown>);
      // Add to source object's connections
      const existing = connectionMap.get(conn.sourceId) || [];
      existing.push(conn);
      connectionMap.set(conn.sourceId, existing);
    }
  }

  // Assign connections to objects
  for (const obj of objects) {
    obj.sourceConnections = connectionMap.get(obj.id) || [];
  }

  return {
    id,
    name,
    viewpoint,
    documentation,
    objects,
  };
}

/**
 * Parse ArchiMate Open Exchange Format XML string into model
 */
export function parseExchangeFormat(xmlContent: string): ArchiMateModel {
  const parser = new XMLParser(parserOptions);
  const parsed = parser.parse(xmlContent);

  // Find the model element (may have namespace prefix)
  const modelData = parsed['model'] || parsed['archimate:model'] || {};

  // Extract model metadata
  const id = String(modelData['@_identifier'] || 'model-1');
  const name = getText(modelData['name']) || 'Imported Model';
  const documentation = getText(modelData['documentation']) || undefined;

  // Create folder structure
  const folders = createFolderStructure();

  // Parse elements
  const elementsContainer = modelData['elements'] || {};
  const elementList = ensureArray(elementsContainer['element']);

  for (const elemData of elementList) {
    if (typeof elemData === 'object' && elemData !== null) {
      const element = parseElement(elemData as Record<string, unknown>);
      if (element) {
        const folder = getFolderForType(folders, element.type);
        folder.elements.push(element);
      }
    }
  }

  // Parse relationships
  const relationshipsContainer = modelData['relationships'] || {};
  const relationshipList = ensureArray(relationshipsContainer['relationship']);
  const relationships: ArchiMateRelationship[] = [];

  for (const relData of relationshipList) {
    if (typeof relData === 'object' && relData !== null) {
      const rel = parseRelationship(relData as Record<string, unknown>);
      if (rel) {
        relationships.push(rel);
      }
    }
  }

  // Parse views
  const viewsContainer = modelData['views'] || {};
  const diagramsContainer = viewsContainer['diagrams'] || viewsContainer;
  const viewList = ensureArray(diagramsContainer['view']);
  const diagrams: ArchiMateDiagram[] = [];

  for (const viewData of viewList) {
    if (typeof viewData === 'object' && viewData !== null) {
      diagrams.push(parseDiagram(viewData as Record<string, unknown>));
    }
  }

  return {
    id,
    name,
    version: '5.0.0',
    documentation,
    folders,
    relationships,
    diagrams,
  };
}

/**
 * Read and parse ArchiMate Open Exchange Format file
 */
export async function readExchangeFile(filePath: string): Promise<ArchiMateModel> {
  const content = await fs.readFile(filePath, 'utf-8');
  return parseExchangeFormat(content);
}
