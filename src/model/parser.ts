/**
 * ArchiMate Model XML Parser
 * Parses model.archimate files from coArchi2 repositories
 */

import { XMLParser } from 'fast-xml-parser';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  ArchiMateModel,
  ArchiMateFolder,
  ArchiMateElement,
  ArchiMateRelationship,
  ArchiMateDiagram,
  DiagramObject,
  DiagramConnection,
  DiagramBounds,
  ElementType,
  RelationshipType,
  AccessType,
  InfluenceModifier,
  XmlTypeToElementType,
  XmlTypeToRelationshipType,
  ArchiMateProperty,
} from './types.js';

const MODEL_FILENAME = 'model.archimate';

interface XmlElement {
  '@_xsi:type'?: string;
  '@_name'?: string;
  '@_id'?: string;
  '@_source'?: string;
  '@_target'?: string;
  '@_accessType'?: string;
  '@_modifier'?: string;
  '@_archimateElement'?: string;
  '@_archimateRelationship'?: string;
  documentation?: string;
  property?: XmlProperty | XmlProperty[];
  bounds?: XmlBounds;
  child?: XmlElement | XmlElement[];
  sourceConnection?: XmlConnection | XmlConnection[];
  '@_targetConnections'?: string;
  element?: XmlElement | XmlElement[];
  folder?: XmlFolder | XmlFolder[];
}

interface XmlProperty {
  '@_key': string;
  '@_value': string;
}

interface XmlBounds {
  '@_x'?: string;
  '@_y'?: string;
  '@_width'?: string;
  '@_height'?: string;
}

interface XmlConnection {
  '@_xsi:type'?: string;
  '@_id': string;
  '@_source': string;
  '@_target': string;
  '@_archimateRelationship'?: string;
  bendpoint?: XmlBendpoint | XmlBendpoint[];
}

interface XmlBendpoint {
  '@_x'?: string;
  '@_y'?: string;
}

interface XmlFolder {
  '@_name': string;
  '@_id': string;
  '@_type'?: string;
  element?: XmlElement | XmlElement[];
  folder?: XmlFolder | XmlFolder[];
}

interface XmlModel {
  'archimate:model': {
    '@_xmlns:xsi': string;
    '@_xmlns:archimate': string;
    '@_name': string;
    '@_id': string;
    '@_version'?: string;
    documentation?: string;
    folder?: XmlFolder | XmlFolder[];
  };
}

function toArray<T>(item: T | T[] | undefined): T[] {
  if (item === undefined) return [];
  return Array.isArray(item) ? item : [item];
}

function parseProperties(props: XmlProperty | XmlProperty[] | undefined): ArchiMateProperty[] {
  if (!props) return [];
  return toArray(props).map(p => ({
    key: p['@_key'],
    value: p['@_value'],
  }));
}

function parseBounds(bounds: XmlBounds | undefined): DiagramBounds {
  return {
    x: parseInt(bounds?.['@_x'] || '0', 10),
    y: parseInt(bounds?.['@_y'] || '0', 10),
    width: parseInt(bounds?.['@_width'] || '120', 10),
    height: parseInt(bounds?.['@_height'] || '55', 10),
  };
}

function parseConnections(conns: XmlConnection | XmlConnection[] | undefined): DiagramConnection[] {
  return toArray(conns).map(c => ({
    id: c['@_id'],
    sourceId: c['@_source'],
    targetId: c['@_target'],
    relationshipId: c['@_archimateRelationship'] || '',
    bendpoints: toArray(c.bendpoint).map(bp => ({
      x: parseInt(bp['@_x'] || '0', 10),
      y: parseInt(bp['@_y'] || '0', 10),
    })),
  }));
}

function parseDiagramObjects(children: XmlElement | XmlElement[] | undefined): DiagramObject[] {
  return toArray(children).map(child => {
    const targetConns = child['@_targetConnections'];
    return {
      id: child['@_id'] || '',
      elementId: child['@_archimateElement'] || '',
      bounds: parseBounds(child.bounds),
      sourceConnections: parseConnections(child.sourceConnection),
      targetConnectionIds: targetConns ? targetConns.split(' ') : [],
      children: parseDiagramObjects(child.child),
    };
  });
}

function parseElement(elem: XmlElement): ArchiMateElement | null {
  const xsiType = elem['@_xsi:type'];
  if (!xsiType) return null;

  const elementType = XmlTypeToElementType[xsiType];
  if (!elementType) return null; // Not a model element (could be a diagram)

  return {
    id: elem['@_id'] || '',
    type: elementType,
    name: elem['@_name'] || '',
    documentation: elem.documentation,
    properties: parseProperties(elem.property),
  };
}

function parseRelationship(elem: XmlElement): ArchiMateRelationship | null {
  const xsiType = elem['@_xsi:type'];
  if (!xsiType) return null;

  const relType = XmlTypeToRelationshipType[xsiType];
  if (!relType) return null;

  const rel: ArchiMateRelationship = {
    id: elem['@_id'] || '',
    type: relType,
    sourceId: elem['@_source'] || '',
    targetId: elem['@_target'] || '',
    name: elem['@_name'],
    documentation: elem.documentation,
    properties: parseProperties(elem.property),
  };

  // Handle access type for Access relationships
  if (relType === 'Access' && elem['@_accessType']) {
    const accessMap: Record<string, AccessType> = {
      '1': 'Read',
      '2': 'Write',
      '3': 'ReadWrite',
      'read': 'Read',
      'write': 'Write',
      'readWrite': 'ReadWrite',
    };
    rel.accessType = accessMap[elem['@_accessType']] as AccessType;
  }

  // Handle influence modifier
  if (relType === 'Influence' && elem['@_modifier']) {
    rel.influenceModifier = elem['@_modifier'] as InfluenceModifier;
  }

  return rel;
}

function parseDiagram(elem: XmlElement): ArchiMateDiagram | null {
  const xsiType = elem['@_xsi:type'];
  if (xsiType !== 'archimate:ArchimateDiagramModel') return null;

  return {
    id: elem['@_id'] || '',
    name: elem['@_name'] || '',
    documentation: elem.documentation,
    objects: parseDiagramObjects(elem.child),
  };
}

function parseFolder(xmlFolder: XmlFolder): ArchiMateFolder {
  const folder: ArchiMateFolder = {
    id: xmlFolder['@_id'],
    name: xmlFolder['@_name'],
    type: xmlFolder['@_type'] || '',
    elements: [],
    subfolders: [],
  };

  // Parse elements
  for (const elem of toArray(xmlFolder.element)) {
    const element = parseElement(elem);
    if (element) {
      folder.elements.push(element);
    }
  }

  // Parse subfolders
  for (const sub of toArray(xmlFolder.folder)) {
    folder.subfolders.push(parseFolder(sub));
  }

  return folder;
}

export async function parseModel(modelPath: string): Promise<ArchiMateModel> {
  // Check if path is a directory or file
  let filePath = modelPath;
  if (!filePath.endsWith('.archimate')) {
    filePath = join(modelPath, MODEL_FILENAME);
  }

  if (!existsSync(filePath)) {
    throw new Error(`Model file not found: ${filePath}`);
  }

  const xmlContent = await readFile(filePath, 'utf-8');

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    isArray: (name) => ['folder', 'element', 'child', 'property', 'sourceConnection', 'bendpoint'].includes(name),
  });

  const parsed = parser.parse(xmlContent) as XmlModel;
  const xmlModel = parsed['archimate:model'];

  if (!xmlModel) {
    throw new Error('Invalid ArchiMate model: missing archimate:model root element');
  }

  const model: ArchiMateModel = {
    id: xmlModel['@_id'],
    name: xmlModel['@_name'],
    version: xmlModel['@_version'] || '5.0.0',
    documentation: xmlModel.documentation,
    folders: [],
    relationships: [],
    diagrams: [],
  };

  // Parse all folders
  for (const xmlFolder of toArray(xmlModel.folder)) {
    const folder = parseFolder(xmlFolder);
    model.folders.push(folder);

    // Extract relationships from the Relations folder
    if (folder.type === 'relations') {
      extractRelationships(folder, model.relationships);
    }

    // Extract diagrams from the Views folder
    if (folder.type === 'diagrams') {
      extractDiagrams(xmlFolder, model.diagrams);
    }
  }

  return model;
}

function extractRelationships(folder: ArchiMateFolder, relationships: ArchiMateRelationship[]): void {
  // The folder.elements in relations folder are actually stored differently
  // We need to re-parse from the raw elements
  // For now, we'll use a workaround by checking if elements exist
}

function extractDiagrams(xmlFolder: XmlFolder, diagrams: ArchiMateDiagram[]): void {
  for (const elem of toArray(xmlFolder.element)) {
    const diagram = parseDiagram(elem);
    if (diagram) {
      diagrams.push(diagram);
    }
  }

  // Check subfolders
  for (const sub of toArray(xmlFolder.folder)) {
    extractDiagrams(sub, diagrams);
  }
}

/**
 * Enhanced parser that also extracts relationships properly
 */
export async function parseModelComplete(modelPath: string): Promise<ArchiMateModel> {
  let filePath = modelPath;
  if (!filePath.endsWith('.archimate')) {
    filePath = join(modelPath, MODEL_FILENAME);
  }

  if (!existsSync(filePath)) {
    throw new Error(`Model file not found: ${filePath}`);
  }

  const xmlContent = await readFile(filePath, 'utf-8');

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
  });

  const parsed = parser.parse(xmlContent) as XmlModel;
  const xmlModel = parsed['archimate:model'];

  if (!xmlModel) {
    throw new Error('Invalid ArchiMate model: missing archimate:model root element');
  }

  const model: ArchiMateModel = {
    id: xmlModel['@_id'],
    name: xmlModel['@_name'],
    version: xmlModel['@_version'] || '5.0.0',
    documentation: xmlModel.documentation,
    folders: [],
    relationships: [],
    diagrams: [],
  };

  // Process all folders recursively
  function processFolder(xmlFolder: XmlFolder, parentFolder: ArchiMateFolder | null): ArchiMateFolder {
    const folder: ArchiMateFolder = {
      id: xmlFolder['@_id'],
      name: xmlFolder['@_name'],
      type: xmlFolder['@_type'] || '',
      elements: [],
      subfolders: [],
    };

    // Parse elements
    const elements = toArray(xmlFolder.element);
    for (const elem of elements) {
      const xsiType = elem['@_xsi:type'];

      // Check if it's a relationship
      if (xsiType && XmlTypeToRelationshipType[xsiType]) {
        const rel = parseRelationship(elem);
        if (rel) {
          model.relationships.push(rel);
        }
      }
      // Check if it's a diagram
      else if (xsiType === 'archimate:ArchimateDiagramModel') {
        const diagram = parseDiagram(elem);
        if (diagram) {
          model.diagrams.push(diagram);
        }
      }
      // Otherwise it's a regular element
      else {
        const element = parseElement(elem);
        if (element) {
          folder.elements.push(element);
        }
      }
    }

    // Parse subfolders
    for (const sub of toArray(xmlFolder.folder)) {
      folder.subfolders.push(processFolder(sub, folder));
    }

    return folder;
  }

  for (const xmlFolder of toArray(xmlModel.folder)) {
    model.folders.push(processFolder(xmlFolder, null));
  }

  return model;
}

/**
 * Find all elements in a model
 */
export function getAllElements(model: ArchiMateModel): ArchiMateElement[] {
  const elements: ArchiMateElement[] = [];

  function collectFromFolder(folder: ArchiMateFolder): void {
    elements.push(...folder.elements);
    for (const subfolder of folder.subfolders) {
      collectFromFolder(subfolder);
    }
  }

  for (const folder of model.folders) {
    collectFromFolder(folder);
  }

  return elements;
}

/**
 * Find an element by ID
 */
export function getElementById(model: ArchiMateModel, id: string): ArchiMateElement | undefined {
  return getAllElements(model).find(e => e.id === id);
}

/**
 * Find elements by type
 */
export function getElementsByType(model: ArchiMateModel, type: ElementType): ArchiMateElement[] {
  return getAllElements(model).filter(e => e.type === type);
}

/**
 * Find elements by name pattern
 */
export function findElementsByName(model: ArchiMateModel, pattern: string): ArchiMateElement[] {
  const regex = new RegExp(pattern, 'i');
  return getAllElements(model).filter(e => regex.test(e.name));
}

/**
 * Get relationships for an element
 */
export function getRelationshipsForElement(
  model: ArchiMateModel,
  elementId: string,
  direction: 'incoming' | 'outgoing' | 'both' = 'both'
): ArchiMateRelationship[] {
  return model.relationships.filter(r => {
    if (direction === 'outgoing') return r.sourceId === elementId;
    if (direction === 'incoming') return r.targetId === elementId;
    return r.sourceId === elementId || r.targetId === elementId;
  });
}

/**
 * Get folder by type
 */
export function getFolderByType(model: ArchiMateModel, type: string): ArchiMateFolder | undefined {
  function findFolder(folders: ArchiMateFolder[]): ArchiMateFolder | undefined {
    for (const folder of folders) {
      if (folder.type === type) return folder;
      const found = findFolder(folder.subfolders);
      if (found) return found;
    }
    return undefined;
  }

  return findFolder(model.folders);
}
