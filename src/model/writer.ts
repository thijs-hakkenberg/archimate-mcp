/**
 * ArchiMate Model XML Writer
 * Writes model.archimate files compatible with coArchi2
 */

import { XMLBuilder } from 'fast-xml-parser';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import {
  ArchiMateModel,
  ArchiMateFolder,
  ArchiMateElement,
  ArchiMateRelationship,
  ArchiMateDiagram,
  DiagramObject,
  DiagramConnection,
  ElementTypeToXmlType,
  RelationshipTypeToXmlType,
  ArchiMateProperty,
} from './types.js';

const MODEL_FILENAME = 'model.archimate';

interface XmlAttribute {
  '@_xsi:type'?: string;
  '@_name'?: string;
  '@_id'?: string;
  '@_source'?: string;
  '@_target'?: string;
  '@_type'?: string;
  '@_accessType'?: string;
  '@_modifier'?: string;
  '@_archimateElement'?: string;
  '@_archimateRelationship'?: string;
  '@_targetConnections'?: string;
  '@_x'?: string;
  '@_y'?: string;
  '@_width'?: string;
  '@_height'?: string;
  '@_key'?: string;
  '@_value'?: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildProperties(props: ArchiMateProperty[] | undefined): object[] {
  if (!props || props.length === 0) return [];
  return props.map(p => ({
    '@_key': p.key,
    '@_value': p.value,
  }));
}

function buildElement(element: ArchiMateElement): object {
  const xmlType = ElementTypeToXmlType[element.type];
  const obj: Record<string, unknown> = {
    '@_xsi:type': xmlType,
    '@_name': element.name,
    '@_id': element.id,
  };

  if (element.documentation) {
    obj.documentation = element.documentation;
  }

  const props = buildProperties(element.properties);
  if (props.length > 0) {
    obj.property = props;
  }

  return obj;
}

function buildRelationship(rel: ArchiMateRelationship): object {
  const xmlType = RelationshipTypeToXmlType[rel.type];
  const obj: Record<string, unknown> = {
    '@_xsi:type': xmlType,
    '@_id': rel.id,
    '@_source': rel.sourceId,
    '@_target': rel.targetId,
  };

  if (rel.name) {
    obj['@_name'] = rel.name;
  }

  if (rel.documentation) {
    obj.documentation = rel.documentation;
  }

  // Handle access type
  if (rel.type === 'Access' && rel.accessType) {
    const accessMap: Record<string, string> = {
      Read: '1',
      Write: '2',
      ReadWrite: '3',
    };
    obj['@_accessType'] = accessMap[rel.accessType] || '3';
  }

  // Handle influence modifier
  if (rel.type === 'Influence' && rel.influenceModifier) {
    obj['@_modifier'] = rel.influenceModifier;
  }

  const props = buildProperties(rel.properties);
  if (props.length > 0) {
    obj.property = props;
  }

  return obj;
}

function buildConnection(conn: DiagramConnection): object {
  const obj: Record<string, unknown> = {
    '@_xsi:type': 'archimate:Connection',
    '@_id': conn.id,
    '@_source': conn.sourceId,
    '@_target': conn.targetId,
  };

  if (conn.relationshipId) {
    obj['@_archimateRelationship'] = conn.relationshipId;
  }

  if (conn.bendpoints && conn.bendpoints.length > 0) {
    obj.bendpoint = conn.bendpoints.map(bp => ({
      '@_x': String(bp.x),
      '@_y': String(bp.y),
    }));
  }

  return obj;
}

function buildDiagramObject(diagObj: DiagramObject): object {
  const obj: Record<string, unknown> = {
    '@_xsi:type': 'archimate:DiagramObject',
    '@_id': diagObj.id,
  };

  if (diagObj.elementId) {
    obj['@_archimateElement'] = diagObj.elementId;
  }

  if (diagObj.targetConnectionIds && diagObj.targetConnectionIds.length > 0) {
    obj['@_targetConnections'] = diagObj.targetConnectionIds.join(' ');
  }

  obj.bounds = {
    '@_x': String(diagObj.bounds.x),
    '@_y': String(diagObj.bounds.y),
    '@_width': String(diagObj.bounds.width),
    '@_height': String(diagObj.bounds.height),
  };

  if (diagObj.sourceConnections && diagObj.sourceConnections.length > 0) {
    obj.sourceConnection = diagObj.sourceConnections.map(buildConnection);
  }

  if (diagObj.children && diagObj.children.length > 0) {
    obj.child = diagObj.children.map(buildDiagramObject);
  }

  return obj;
}

function buildDiagram(diagram: ArchiMateDiagram): object {
  const obj: Record<string, unknown> = {
    '@_xsi:type': 'archimate:ArchimateDiagramModel',
    '@_name': diagram.name,
    '@_id': diagram.id,
  };

  if (diagram.documentation) {
    obj.documentation = diagram.documentation;
  }

  if (diagram.objects.length > 0) {
    obj.child = diagram.objects.map(buildDiagramObject);
  }

  return obj;
}

function buildFolder(folder: ArchiMateFolder, isRelations: boolean = false): object {
  const obj: Record<string, unknown> = {
    '@_name': folder.name,
    '@_id': folder.id,
  };

  if (folder.type) {
    obj['@_type'] = folder.type;
  }

  const elements: object[] = [];

  // Add elements
  for (const elem of folder.elements) {
    elements.push(buildElement(elem));
  }

  if (elements.length > 0) {
    obj.element = elements;
  }

  // Add subfolders
  if (folder.subfolders.length > 0) {
    obj.folder = folder.subfolders.map(sf => buildFolder(sf, isRelations));
  }

  return obj;
}

export async function writeModel(model: ArchiMateModel, outputPath: string): Promise<void> {
  const filePath = outputPath.endsWith('.archimate') ? outputPath : join(outputPath, MODEL_FILENAME);

  // Build the XML structure
  const folders: object[] = [];

  for (const folder of model.folders) {
    const isRelations = folder.type === 'relations';
    const isDiagrams = folder.type === 'diagrams';

    if (isRelations) {
      // Add relationships as elements in the Relations folder
      const relFolder: Record<string, unknown> = {
        '@_name': folder.name,
        '@_id': folder.id,
        '@_type': folder.type,
      };

      if (model.relationships.length > 0) {
        relFolder.element = model.relationships.map(buildRelationship);
      }

      folders.push(relFolder);
    } else if (isDiagrams) {
      // Add diagrams as elements in the Views folder
      const diagFolder: Record<string, unknown> = {
        '@_name': folder.name,
        '@_id': folder.id,
        '@_type': folder.type,
      };

      if (model.diagrams.length > 0) {
        diagFolder.element = model.diagrams.map(buildDiagram);
      }

      // Add subfolders with their diagrams
      if (folder.subfolders.length > 0) {
        diagFolder.folder = folder.subfolders.map(sf => buildFolder(sf, false));
      }

      folders.push(diagFolder);
    } else {
      folders.push(buildFolder(folder, false));
    }
  }

  const xmlObj = {
    '?xml': {
      '@_version': '1.0',
      '@_encoding': 'UTF-8',
    },
    'archimate:model': {
      '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@_xmlns:archimate': 'http://www.archimatetool.com/archimate',
      '@_name': model.name,
      '@_id': model.id,
      '@_version': model.version,
      ...(model.documentation ? { documentation: model.documentation } : {}),
      folder: folders,
    },
  };

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
    indentBy: '  ',
    suppressEmptyNode: true,
  });

  const xmlContent = builder.build(xmlObj);

  await writeFile(filePath, xmlContent, 'utf-8');
}

/**
 * Create a new empty model with standard folder structure
 */
export function createEmptyModel(name: string, id: string): ArchiMateModel {
  return {
    id,
    name,
    version: '5.0.0',
    folders: [
      { id: generateId(), name: 'Strategy', type: 'strategy', elements: [], subfolders: [] },
      { id: generateId(), name: 'Business', type: 'business', elements: [], subfolders: [] },
      { id: generateId(), name: 'Application', type: 'application', elements: [], subfolders: [] },
      { id: generateId(), name: 'Technology & Physical', type: 'technology', elements: [], subfolders: [] },
      { id: generateId(), name: 'Motivation', type: 'motivation', elements: [], subfolders: [] },
      { id: generateId(), name: 'Implementation & Migration', type: 'implementation_migration', elements: [], subfolders: [] },
      { id: generateId(), name: 'Other', type: 'other', elements: [], subfolders: [] },
      { id: generateId(), name: 'Relations', type: 'relations', elements: [], subfolders: [] },
      { id: generateId(), name: 'Views', type: 'diagrams', elements: [], subfolders: [] },
    ],
    relationships: [],
    diagrams: [],
  };
}

/**
 * Generate a unique ID in the ArchiMate format
 */
export function generateId(): string {
  const chars = '0123456789abcdef';
  let id = 'id-';
  for (let i = 0; i < 32; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * Add an element to the appropriate folder
 */
export function addElementToModel(
  model: ArchiMateModel,
  element: ArchiMateElement
): ArchiMateModel {
  const folderType = getFolderTypeForElement(element.type);

  function addToFolder(folders: ArchiMateFolder[]): boolean {
    for (const folder of folders) {
      if (folder.type === folderType) {
        folder.elements.push(element);
        return true;
      }
      if (addToFolder(folder.subfolders)) {
        return true;
      }
    }
    return false;
  }

  addToFolder(model.folders);
  return model;
}

/**
 * Add a relationship to the model
 */
export function addRelationshipToModel(
  model: ArchiMateModel,
  relationship: ArchiMateRelationship
): ArchiMateModel {
  model.relationships.push(relationship);
  return model;
}

/**
 * Add a diagram to the model
 */
export function addDiagramToModel(
  model: ArchiMateModel,
  diagram: ArchiMateDiagram
): ArchiMateModel {
  model.diagrams.push(diagram);
  return model;
}

/**
 * Remove an element from the model (also removes associated relationships)
 */
export function removeElementFromModel(
  model: ArchiMateModel,
  elementId: string
): ArchiMateModel {
  // Remove from folders
  function removeFromFolder(folders: ArchiMateFolder[]): void {
    for (const folder of folders) {
      folder.elements = folder.elements.filter(e => e.id !== elementId);
      removeFromFolder(folder.subfolders);
    }
  }

  removeFromFolder(model.folders);

  // Remove associated relationships
  model.relationships = model.relationships.filter(
    r => r.sourceId !== elementId && r.targetId !== elementId
  );

  // Remove from diagrams
  for (const diagram of model.diagrams) {
    diagram.objects = diagram.objects.filter(o => o.elementId !== elementId);
  }

  return model;
}

/**
 * Remove a relationship from the model
 */
export function removeRelationshipFromModel(
  model: ArchiMateModel,
  relationshipId: string
): ArchiMateModel {
  model.relationships = model.relationships.filter(r => r.id !== relationshipId);

  // Remove from diagrams
  for (const diagram of model.diagrams) {
    for (const obj of diagram.objects) {
      if (obj.sourceConnections) {
        obj.sourceConnections = obj.sourceConnections.filter(
          c => c.relationshipId !== relationshipId
        );
      }
    }
  }

  return model;
}

/**
 * Update an element in the model
 */
export function updateElementInModel(
  model: ArchiMateModel,
  elementId: string,
  updates: Partial<Pick<ArchiMateElement, 'name' | 'documentation' | 'properties'>>
): ArchiMateModel {
  function updateInFolder(folders: ArchiMateFolder[]): boolean {
    for (const folder of folders) {
      const element = folder.elements.find(e => e.id === elementId);
      if (element) {
        if (updates.name !== undefined) element.name = updates.name;
        if (updates.documentation !== undefined) element.documentation = updates.documentation;
        if (updates.properties !== undefined) element.properties = updates.properties;
        return true;
      }
      if (updateInFolder(folder.subfolders)) {
        return true;
      }
    }
    return false;
  }

  updateInFolder(model.folders);
  return model;
}

function getFolderTypeForElement(elementType: string): string {
  const folderMap: Record<string, string> = {
    // Motivation
    Stakeholder: 'motivation',
    Driver: 'motivation',
    Assessment: 'motivation',
    Goal: 'motivation',
    Outcome: 'motivation',
    Principle: 'motivation',
    Requirement: 'motivation',
    Constraint: 'motivation',
    Meaning: 'motivation',
    Value: 'motivation',
    // Strategy
    Resource: 'strategy',
    Capability: 'strategy',
    ValueStream: 'strategy',
    CourseOfAction: 'strategy',
    // Business
    BusinessActor: 'business',
    BusinessRole: 'business',
    BusinessCollaboration: 'business',
    BusinessInterface: 'business',
    BusinessProcess: 'business',
    BusinessFunction: 'business',
    BusinessInteraction: 'business',
    BusinessEvent: 'business',
    BusinessService: 'business',
    BusinessObject: 'business',
    Contract: 'business',
    Representation: 'business',
    Product: 'business',
    // Application
    ApplicationComponent: 'application',
    ApplicationCollaboration: 'application',
    ApplicationInterface: 'application',
    ApplicationFunction: 'application',
    ApplicationInteraction: 'application',
    ApplicationProcess: 'application',
    ApplicationEvent: 'application',
    ApplicationService: 'application',
    DataObject: 'application',
    // Technology
    Node: 'technology',
    Device: 'technology',
    SystemSoftware: 'technology',
    TechnologyCollaboration: 'technology',
    TechnologyInterface: 'technology',
    Path: 'technology',
    CommunicationNetwork: 'technology',
    TechnologyFunction: 'technology',
    TechnologyProcess: 'technology',
    TechnologyInteraction: 'technology',
    TechnologyEvent: 'technology',
    TechnologyService: 'technology',
    Artifact: 'technology',
    Equipment: 'technology',
    Facility: 'technology',
    DistributionNetwork: 'technology',
    Material: 'technology',
    // Implementation
    WorkPackage: 'implementation_migration',
    Deliverable: 'implementation_migration',
    ImplementationEvent: 'implementation_migration',
    Plateau: 'implementation_migration',
    Gap: 'implementation_migration',
    // Composite
    Grouping: 'other',
    Location: 'other',
  };

  return folderMap[elementType] || 'other';
}
