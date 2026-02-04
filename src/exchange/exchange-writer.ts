/**
 * ArchiMate Open Exchange Format Writer
 * Exports ArchiMate models to ArchiMate 3.x exchange format XML
 */

import { XMLBuilder } from 'fast-xml-parser';
import * as fs from 'fs/promises';
import type {
  ArchiMateModel,
  ArchiMateFolder,
  ArchiMateElement,
  ArchiMateRelationship,
  ArchiMateDiagram,
  DiagramObject,
  DiagramConnection,
} from '../model/types.js';

// Builder configuration
const builderOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  format: true,
  indentBy: '  ',
  suppressEmptyNode: true,
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
 * Build element XML object for exchange format
 */
function buildElement(element: ArchiMateElement): Record<string, unknown> {
  const elem: Record<string, unknown> = {
    '@_identifier': element.id,
    '@_xsi:type': element.type,
    name: {
      '@_xml:lang': 'en',
      '#text': element.name,
    },
  };

  if (element.documentation) {
    elem['documentation'] = {
      '@_xml:lang': 'en',
      '#text': element.documentation,
    };
  }

  return elem;
}

/**
 * Build relationship XML object for exchange format
 */
function buildRelationship(rel: ArchiMateRelationship): Record<string, unknown> {
  const relObj: Record<string, unknown> = {
    '@_identifier': rel.id,
    '@_xsi:type': rel.type,
    '@_source': rel.sourceId,
    '@_target': rel.targetId,
  };

  if (rel.name) {
    relObj['name'] = {
      '@_xml:lang': 'en',
      '#text': rel.name,
    };
  }

  if (rel.documentation) {
    relObj['documentation'] = {
      '@_xml:lang': 'en',
      '#text': rel.documentation,
    };
  }

  return relObj;
}

/**
 * Build diagram node XML object for exchange format
 */
function buildDiagramNode(obj: DiagramObject): Record<string, unknown> {
  return {
    '@_identifier': obj.id,
    '@_elementRef': obj.elementId,
    '@_x': obj.bounds.x,
    '@_y': obj.bounds.y,
    '@_w': obj.bounds.width,
    '@_h': obj.bounds.height,
  };
}

/**
 * Build diagram connection XML object for exchange format
 */
function buildConnection(conn: DiagramConnection): Record<string, unknown> {
  return {
    '@_identifier': conn.id,
    '@_relationshipRef': conn.relationshipId,
    '@_source': conn.sourceId,
    '@_target': conn.targetId,
  };
}

/**
 * Build view XML object for exchange format
 */
function buildView(diagram: ArchiMateDiagram): Record<string, unknown> {
  const view: Record<string, unknown> = {
    '@_identifier': diagram.id,
    name: {
      '@_xml:lang': 'en',
      '#text': diagram.name,
    },
  };

  if (diagram.viewpoint) {
    view['@_viewpoint'] = diagram.viewpoint;
  }

  if (diagram.documentation) {
    view['documentation'] = {
      '@_xml:lang': 'en',
      '#text': diagram.documentation,
    };
  }

  // Build nodes
  const nodes: Record<string, unknown>[] = [];
  const connections: Record<string, unknown>[] = [];

  function collectObjects(objects: DiagramObject[]): void {
    for (const obj of objects) {
      nodes.push(buildDiagramNode(obj));

      // Collect connections
      if (obj.sourceConnections) {
        for (const conn of obj.sourceConnections) {
          connections.push(buildConnection(conn));
        }
      }

      // Handle nested objects
      if (obj.children) {
        collectObjects(obj.children);
      }
    }
  }

  collectObjects(diagram.objects);

  if (nodes.length > 0) {
    view['node'] = nodes;
  }

  if (connections.length > 0) {
    view['connection'] = connections;
  }

  return view;
}

/**
 * Convert ArchiMate model to Open Exchange Format XML string
 */
export function writeExchangeFormat(model: ArchiMateModel): string {
  // Build model structure
  const modelObj: Record<string, unknown> = {
    '@_xmlns': 'http://www.opengroup.org/xsd/archimate/3.0/',
    '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    '@_xsi:schemaLocation': 'http://www.opengroup.org/xsd/archimate/3.0/ http://www.opengroup.org/xsd/archimate/3.1/archimate3_Model.xsd',
    '@_identifier': model.id,
    name: {
      '@_xml:lang': 'en',
      '#text': model.name,
    },
  };

  // Add documentation if present
  if (model.documentation) {
    modelObj['documentation'] = {
      '@_xml:lang': 'en',
      '#text': model.documentation,
    };
  }

  // Build elements
  const allElements = getAllElements(model);
  if (allElements.length > 0) {
    modelObj['elements'] = {
      element: allElements.map(buildElement),
    };
  } else {
    modelObj['elements'] = {};
  }

  // Build relationships
  if (model.relationships.length > 0) {
    modelObj['relationships'] = {
      relationship: model.relationships.map(buildRelationship),
    };
  } else {
    modelObj['relationships'] = {};
  }

  // Build views
  if (model.diagrams.length > 0) {
    modelObj['views'] = {
      diagrams: {
        view: model.diagrams.map(buildView),
      },
    };
  }

  // Build XML
  const builder = new XMLBuilder(builderOptions);
  const xmlContent = builder.build({ model: modelObj });

  // Add XML declaration
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlContent;
}

/**
 * Save ArchiMate model to Open Exchange Format file
 */
export async function saveExchangeFile(
  model: ArchiMateModel,
  outputPath: string
): Promise<void> {
  const xml = writeExchangeFormat(model);
  await fs.writeFile(outputPath, xml, 'utf-8');
}
