/**
 * ArchiMate MCP Server
 * Enables LLMs to work with ArchiMate models stored in coArchi2 repositories
 *
 * Design follows ArchiMate 3.2 specification chapter structure
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Tool,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';

import {
  parseModelComplete,
  getAllElements,
  getElementById,
  getElementsByType,
  findElementsByName,
  getRelationshipsForElement,
  getFolderByType,
} from './model/parser.js';

import {
  writeModel,
  createEmptyModel,
  generateId,
  addElementToModel,
  addRelationshipToModel,
  addDiagramToModel,
  removeElementFromModel,
  removeRelationshipFromModel,
  updateElementInModel,
} from './model/writer.js';

import {
  ArchiMateModel,
  ArchiMateElement,
  ArchiMateRelationship,
  ArchiMateDiagram,
  DiagramObject,
  DiagramConnection,
  ElementType,
  RelationshipType,
  AccessType,
  InfluenceModifier,
  Layer,
  MotivationElementTypes,
  StrategyElementTypes,
  BusinessElementTypes,
  ApplicationElementTypes,
  TechnologyElementTypes,
  ImplementationElementTypes,
  CompositeElementTypes,
  RelationshipTypes,
  ElementDescriptions,
  RelationshipDescriptions,
  getLayerForElementType,
} from './model/types.js';

import {
  isValidRelationship,
  getValidRelationshipTypes,
  validateRelationship,
  getRelationshipGuidance,
} from './relationships/validation.js';

// =============================================================================
// Server State
// =============================================================================

let currentModel: ArchiMateModel | null = null;
let currentModelPath: string | null = null;

// =============================================================================
// Tool Definitions
// =============================================================================

const tools: Tool[] = [
  // ---------------------------------------------------------------------------
  // Model Management Tools
  // ---------------------------------------------------------------------------
  {
    name: 'archimate_open_model',
    description: 'Open an ArchiMate model from a coArchi repository directory. Returns model metadata including element counts by layer.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the model directory or model.archimate file',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'archimate_save_model',
    description: 'Save the current model to disk',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Optional path to save to (uses original path if not specified)',
        },
      },
    },
  },
  {
    name: 'archimate_create_model',
    description: 'Create a new empty ArchiMate model with standard folder structure',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the new model',
        },
        path: {
          type: 'string',
          description: 'Path where to save the model',
        },
      },
      required: ['name', 'path'],
    },
  },

  // ---------------------------------------------------------------------------
  // Navigation Tools
  // ---------------------------------------------------------------------------
  {
    name: 'archimate_list_elements',
    description: 'List elements in the model, optionally filtered by layer or type',
    inputSchema: {
      type: 'object',
      properties: {
        layer: {
          type: 'string',
          enum: ['Motivation', 'Strategy', 'Business', 'Application', 'Technology', 'Physical', 'Implementation', 'Composite'],
          description: 'Filter by ArchiMate layer',
        },
        element_type: {
          type: 'string',
          description: 'Filter by specific element type (e.g., BusinessActor, ApplicationComponent)',
        },
      },
    },
  },
  {
    name: 'archimate_get_element',
    description: 'Get detailed information about a specific element including its relationships',
    inputSchema: {
      type: 'object',
      properties: {
        element_id: {
          type: 'string',
          description: 'The ID of the element to retrieve',
        },
      },
      required: ['element_id'],
    },
  },
  {
    name: 'archimate_find_elements',
    description: 'Search for elements by name pattern (case-insensitive regex)',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Name pattern to search for (regex supported)',
        },
        layer: {
          type: 'string',
          enum: ['Motivation', 'Strategy', 'Business', 'Application', 'Technology', 'Physical', 'Implementation', 'Composite'],
          description: 'Optional layer filter',
        },
      },
      required: ['pattern'],
    },
  },

  // ---------------------------------------------------------------------------
  // Layer-Specific Creation Tools (LLM-Friendly with Enumerations)
  // ---------------------------------------------------------------------------
  {
    name: 'archimate_create_motivation_element',
    description: 'Create a Motivation layer element (Chapter 6). Use for stakeholders, goals, requirements, etc.',
    inputSchema: {
      type: 'object',
      properties: {
        element_type: {
          type: 'string',
          enum: [...MotivationElementTypes],
          description: 'Type of motivation element: Stakeholder (person/role with interests), Driver (motivation condition), Assessment (analysis result), Goal (desired end state), Outcome (end result), Principle (general intent), Requirement (specific need), Constraint (limitation), Meaning (interpretation), Value (worth/importance)',
        },
        name: {
          type: 'string',
          description: 'Name of the element',
        },
        documentation: {
          type: 'string',
          description: 'Optional documentation/description',
        },
      },
      required: ['element_type', 'name'],
    },
  },
  {
    name: 'archimate_create_strategy_element',
    description: 'Create a Strategy layer element (Chapter 7). Use for capabilities, resources, and strategic planning.',
    inputSchema: {
      type: 'object',
      properties: {
        element_type: {
          type: 'string',
          enum: [...StrategyElementTypes],
          description: 'Type of strategy element: Resource (owned asset), Capability (ability to do something), ValueStream (sequence creating value), CourseOfAction (strategic approach/plan)',
        },
        name: {
          type: 'string',
          description: 'Name of the element',
        },
        documentation: {
          type: 'string',
          description: 'Optional documentation/description',
        },
      },
      required: ['element_type', 'name'],
    },
  },
  {
    name: 'archimate_create_business_element',
    description: 'Create a Business layer element (Chapter 8). Use for actors, processes, services, and business objects.',
    inputSchema: {
      type: 'object',
      properties: {
        element_type: {
          type: 'string',
          enum: [...BusinessElementTypes],
          description: 'Type of business element: BusinessActor (entity performing behavior), BusinessRole (responsibility), BusinessCollaboration (working together), BusinessInterface (access point), BusinessProcess (sequence of behaviors), BusinessFunction (collection of behavior), BusinessInteraction (collective behavior), BusinessEvent (state change), BusinessService (exposed behavior), BusinessObject (concept/information), Contract (agreement), Representation (perceptible form), Product (collection of services)',
        },
        name: {
          type: 'string',
          description: 'Name of the element',
        },
        documentation: {
          type: 'string',
          description: 'Optional documentation/description',
        },
      },
      required: ['element_type', 'name'],
    },
  },
  {
    name: 'archimate_create_application_element',
    description: 'Create an Application layer element (Chapter 9). Use for application components, services, and data objects.',
    inputSchema: {
      type: 'object',
      properties: {
        element_type: {
          type: 'string',
          enum: [...ApplicationElementTypes],
          description: 'Type of application element: ApplicationComponent (software unit), ApplicationCollaboration (components working together), ApplicationInterface (access point), ApplicationFunction (automated behavior), ApplicationInteraction (collective behavior), ApplicationProcess (sequence of behaviors), ApplicationEvent (state change), ApplicationService (exposed behavior), DataObject (structured data)',
        },
        name: {
          type: 'string',
          description: 'Name of the element',
        },
        documentation: {
          type: 'string',
          description: 'Optional documentation/description',
        },
      },
      required: ['element_type', 'name'],
    },
  },
  {
    name: 'archimate_create_technology_element',
    description: 'Create a Technology layer element (Chapter 10). Use for nodes, devices, infrastructure, and physical elements.',
    inputSchema: {
      type: 'object',
      properties: {
        element_type: {
          type: 'string',
          enum: [...TechnologyElementTypes],
          description: 'Type of technology element: Node (computational resource), Device (physical IT resource), SystemSoftware (infrastructure software), TechnologyCollaboration (working together), TechnologyInterface (access point), Path (link between elements), CommunicationNetwork (connects devices), TechnologyFunction (collection of behavior), TechnologyProcess (sequence of behaviors), TechnologyInteraction (collective behavior), TechnologyEvent (state change), TechnologyService (exposed behavior), Artifact (data/software file), Equipment (physical machines), Facility (physical structure), DistributionNetwork (transport network), Material (physical matter)',
        },
        name: {
          type: 'string',
          description: 'Name of the element',
        },
        documentation: {
          type: 'string',
          description: 'Optional documentation/description',
        },
      },
      required: ['element_type', 'name'],
    },
  },
  {
    name: 'archimate_create_implementation_element',
    description: 'Create an Implementation & Migration layer element (Chapter 12). Use for work packages, deliverables, and architecture plateaus.',
    inputSchema: {
      type: 'object',
      properties: {
        element_type: {
          type: 'string',
          enum: [...ImplementationElementTypes],
          description: 'Type of implementation element: WorkPackage (series of actions), Deliverable (result of work), ImplementationEvent (state change), Plateau (stable architecture state), Gap (difference between plateaus)',
        },
        name: {
          type: 'string',
          description: 'Name of the element',
        },
        documentation: {
          type: 'string',
          description: 'Optional documentation/description',
        },
      },
      required: ['element_type', 'name'],
    },
  },
  {
    name: 'archimate_create_composite_element',
    description: 'Create a composite element (Chapter 4). Use for grouping and locations.',
    inputSchema: {
      type: 'object',
      properties: {
        element_type: {
          type: 'string',
          enum: [...CompositeElementTypes],
          description: 'Type of composite element: Grouping (aggregate concepts), Location (place where things are located)',
        },
        name: {
          type: 'string',
          description: 'Name of the element',
        },
        documentation: {
          type: 'string',
          description: 'Optional documentation/description',
        },
      },
      required: ['element_type', 'name'],
    },
  },

  // ---------------------------------------------------------------------------
  // Relationship Tools
  // ---------------------------------------------------------------------------
  {
    name: 'archimate_create_relationship',
    description: 'Create a relationship between two elements. Validates against ArchiMate specification.',
    inputSchema: {
      type: 'object',
      properties: {
        relationship_type: {
          type: 'string',
          enum: [...RelationshipTypes],
          description: 'Type of relationship: Composition (consists of), Aggregation (combines), Assignment (allocates responsibility), Realization (creates/implements), Serving (provides functionality), Access (reads/writes), Influence (affects), Association (unspecified link), Triggering (causes), Flow (transfers), Specialization (is a kind of)',
        },
        source_id: {
          type: 'string',
          description: 'ID of the source element',
        },
        target_id: {
          type: 'string',
          description: 'ID of the target element',
        },
        name: {
          type: 'string',
          description: 'Optional name/label for the relationship',
        },
        access_type: {
          type: 'string',
          enum: ['Read', 'Write', 'ReadWrite'],
          description: 'For Access relationships: type of access',
        },
        influence_modifier: {
          type: 'string',
          enum: ['++', '+', '0', '-', '--'],
          description: 'For Influence relationships: strength modifier',
        },
      },
      required: ['relationship_type', 'source_id', 'target_id'],
    },
  },
  {
    name: 'archimate_list_relationships',
    description: 'List relationships, optionally filtered by element or type',
    inputSchema: {
      type: 'object',
      properties: {
        element_id: {
          type: 'string',
          description: 'Filter to relationships involving this element',
        },
        relationship_type: {
          type: 'string',
          enum: [...RelationshipTypes],
          description: 'Filter by relationship type',
        },
        direction: {
          type: 'string',
          enum: ['incoming', 'outgoing', 'both'],
          description: 'For element_id filter: direction of relationships',
        },
      },
    },
  },
  {
    name: 'archimate_get_valid_relationships',
    description: 'Get valid relationship types between two element types (helps understand what connections are permitted)',
    inputSchema: {
      type: 'object',
      properties: {
        source_type: {
          type: 'string',
          description: 'Source element type',
        },
        target_type: {
          type: 'string',
          description: 'Target element type (optional - shows all valid targets if omitted)',
        },
      },
      required: ['source_type'],
    },
  },

  // ---------------------------------------------------------------------------
  // View/Diagram Tools
  // ---------------------------------------------------------------------------
  {
    name: 'archimate_list_views',
    description: 'List all diagram views in the model',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'archimate_create_view',
    description: 'Create a new diagram view',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the view',
        },
        viewpoint: {
          type: 'string',
          description: 'Optional viewpoint type (e.g., Layered, Organization, Application)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'archimate_add_to_view',
    description: 'Add an element to a diagram view',
    inputSchema: {
      type: 'object',
      properties: {
        view_id: {
          type: 'string',
          description: 'ID of the view',
        },
        element_id: {
          type: 'string',
          description: 'ID of the element to add',
        },
        x: { type: 'number', description: 'X position (default: auto)' },
        y: { type: 'number', description: 'Y position (default: auto)' },
        width: { type: 'number', description: 'Width (default: 120)' },
        height: { type: 'number', description: 'Height (default: 55)' },
      },
      required: ['view_id', 'element_id'],
    },
  },

  {
    name: 'archimate_add_connection_to_view',
    description: 'Add a relationship connection (line/arrow) between two elements in a view. Both elements must already be in the view.',
    inputSchema: {
      type: 'object',
      properties: {
        view_id: {
          type: 'string',
          description: 'ID of the view',
        },
        relationship_id: {
          type: 'string',
          description: 'ID of the relationship to visualize',
        },
        source_diagram_object_id: {
          type: 'string',
          description: 'ID of the source diagram object (from archimate_add_to_view response)',
        },
        target_diagram_object_id: {
          type: 'string',
          description: 'ID of the target diagram object (from archimate_add_to_view response)',
        },
      },
      required: ['view_id', 'relationship_id', 'source_diagram_object_id', 'target_diagram_object_id'],
    },
  },

  // ---------------------------------------------------------------------------
  // Modification Tools
  // ---------------------------------------------------------------------------
  {
    name: 'archimate_update_element',
    description: 'Update an existing element',
    inputSchema: {
      type: 'object',
      properties: {
        element_id: {
          type: 'string',
          description: 'ID of the element to update',
        },
        name: {
          type: 'string',
          description: 'New name (optional)',
        },
        documentation: {
          type: 'string',
          description: 'New documentation (optional)',
        },
      },
      required: ['element_id'],
    },
  },
  {
    name: 'archimate_delete_element',
    description: 'Delete an element and its associated relationships',
    inputSchema: {
      type: 'object',
      properties: {
        element_id: {
          type: 'string',
          description: 'ID of the element to delete',
        },
      },
      required: ['element_id'],
    },
  },
  {
    name: 'archimate_delete_relationship',
    description: 'Delete a relationship',
    inputSchema: {
      type: 'object',
      properties: {
        relationship_id: {
          type: 'string',
          description: 'ID of the relationship to delete',
        },
      },
      required: ['relationship_id'],
    },
  },

  // ---------------------------------------------------------------------------
  // Analysis Tools
  // ---------------------------------------------------------------------------
  {
    name: 'archimate_layer_summary',
    description: 'Get a summary of elements by layer',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'archimate_impact_analysis',
    description: 'Analyze dependencies and impact of an element',
    inputSchema: {
      type: 'object',
      properties: {
        element_id: {
          type: 'string',
          description: 'ID of the element to analyze',
        },
        direction: {
          type: 'string',
          enum: ['incoming', 'outgoing', 'both'],
          description: 'Direction of relationships to analyze',
        },
        depth: {
          type: 'number',
          description: 'How many levels deep to analyze (default: 2)',
        },
      },
      required: ['element_id'],
    },
  },
];

// =============================================================================
// Tool Handlers
// =============================================================================

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<TextContent[]> {
  switch (name) {
    // -------------------------------------------------------------------------
    // Model Management
    // -------------------------------------------------------------------------
    case 'archimate_open_model': {
      const path = args.path as string;
      currentModel = await parseModelComplete(path);
      currentModelPath = path;

      const elements = getAllElements(currentModel);
      const layerCounts: Record<string, number> = {};
      for (const elem of elements) {
        const layer = getLayerForElementType(elem.type);
        layerCounts[layer] = (layerCounts[layer] || 0) + 1;
      }

      return [{
        type: 'text',
        text: JSON.stringify({
          name: currentModel.name,
          id: currentModel.id,
          totalElements: elements.length,
          relationships: currentModel.relationships.length,
          diagrams: currentModel.diagrams.length,
          elementsByLayer: layerCounts,
        }, null, 2),
      }];
    }

    case 'archimate_save_model': {
      if (!currentModel) {
        return [{ type: 'text', text: 'Error: No model is currently open' }];
      }
      const savePath = (args.path as string) || currentModelPath;
      if (!savePath) {
        return [{ type: 'text', text: 'Error: No save path specified' }];
      }
      await writeModel(currentModel, savePath);
      return [{ type: 'text', text: `Model saved to ${savePath}` }];
    }

    case 'archimate_create_model': {
      const name = args.name as string;
      const path = args.path as string;
      const id = generateId();
      currentModel = createEmptyModel(name, id);
      currentModelPath = path;
      await writeModel(currentModel, path);
      return [{
        type: 'text',
        text: JSON.stringify({
          message: 'Model created successfully',
          name,
          id,
          path,
        }, null, 2),
      }];
    }

    // -------------------------------------------------------------------------
    // Navigation
    // -------------------------------------------------------------------------
    case 'archimate_list_elements': {
      if (!currentModel) {
        return [{ type: 'text', text: 'Error: No model is currently open' }];
      }

      let elements = getAllElements(currentModel);

      if (args.layer) {
        elements = elements.filter(e => getLayerForElementType(e.type) === args.layer);
      }

      if (args.element_type) {
        elements = elements.filter(e => e.type === args.element_type);
      }

      return [{
        type: 'text',
        text: JSON.stringify(elements.map(e => ({
          id: e.id,
          type: e.type,
          name: e.name,
          layer: getLayerForElementType(e.type),
        })), null, 2),
      }];
    }

    case 'archimate_get_element': {
      if (!currentModel) {
        return [{ type: 'text', text: 'Error: No model is currently open' }];
      }

      const element = getElementById(currentModel, args.element_id as string);
      if (!element) {
        return [{ type: 'text', text: `Error: Element not found: ${args.element_id}` }];
      }

      const relationships = getRelationshipsForElement(currentModel, element.id);
      const relatedElements: Array<{ direction: string; relationship: string; elementId: string; elementName: string; elementType: string }> = [];

      for (const rel of relationships) {
        const isSource = rel.sourceId === element.id;
        const otherId = isSource ? rel.targetId : rel.sourceId;
        const other = getElementById(currentModel, otherId);
        relatedElements.push({
          direction: isSource ? 'outgoing' : 'incoming',
          relationship: rel.type,
          elementId: otherId,
          elementName: other?.name || 'Unknown',
          elementType: other?.type || 'Unknown',
        });
      }

      return [{
        type: 'text',
        text: JSON.stringify({
          ...element,
          layer: getLayerForElementType(element.type),
          description: ElementDescriptions[element.type],
          relationships: relatedElements,
        }, null, 2),
      }];
    }

    case 'archimate_find_elements': {
      if (!currentModel) {
        return [{ type: 'text', text: 'Error: No model is currently open' }];
      }

      let elements = findElementsByName(currentModel, args.pattern as string);

      if (args.layer) {
        elements = elements.filter(e => getLayerForElementType(e.type) === args.layer);
      }

      return [{
        type: 'text',
        text: JSON.stringify(elements.map(e => ({
          id: e.id,
          type: e.type,
          name: e.name,
          layer: getLayerForElementType(e.type),
        })), null, 2),
      }];
    }

    // -------------------------------------------------------------------------
    // Element Creation
    // -------------------------------------------------------------------------
    case 'archimate_create_motivation_element':
    case 'archimate_create_strategy_element':
    case 'archimate_create_business_element':
    case 'archimate_create_application_element':
    case 'archimate_create_technology_element':
    case 'archimate_create_implementation_element':
    case 'archimate_create_composite_element': {
      if (!currentModel) {
        return [{ type: 'text', text: 'Error: No model is currently open' }];
      }

      const element: ArchiMateElement = {
        id: generateId(),
        type: args.element_type as ElementType,
        name: args.name as string,
        documentation: args.documentation as string | undefined,
      };

      addElementToModel(currentModel, element);

      return [{
        type: 'text',
        text: JSON.stringify({
          message: 'Element created successfully',
          element: {
            ...element,
            layer: getLayerForElementType(element.type),
          },
        }, null, 2),
      }];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------
    case 'archimate_create_relationship': {
      if (!currentModel) {
        return [{ type: 'text', text: 'Error: No model is currently open' }];
      }

      const sourceElement = getElementById(currentModel, args.source_id as string);
      const targetElement = getElementById(currentModel, args.target_id as string);

      if (!sourceElement) {
        return [{ type: 'text', text: `Error: Source element not found: ${args.source_id}` }];
      }
      if (!targetElement) {
        return [{ type: 'text', text: `Error: Target element not found: ${args.target_id}` }];
      }

      const relType = args.relationship_type as RelationshipType;
      const validation = validateRelationship(sourceElement.type, targetElement.type, relType);

      if (!validation.valid) {
        return [{
          type: 'text',
          text: JSON.stringify({
            error: validation.error,
            suggestions: validation.suggestions,
            guidance: getRelationshipGuidance(sourceElement.type, targetElement.type),
          }, null, 2),
        }];
      }

      const relationship: ArchiMateRelationship = {
        id: generateId(),
        type: relType,
        sourceId: args.source_id as string,
        targetId: args.target_id as string,
        name: args.name as string | undefined,
        accessType: args.access_type as AccessType | undefined,
        influenceModifier: args.influence_modifier as InfluenceModifier | undefined,
      };

      addRelationshipToModel(currentModel, relationship);

      return [{
        type: 'text',
        text: JSON.stringify({
          message: 'Relationship created successfully',
          relationship: {
            ...relationship,
            sourceName: sourceElement.name,
            targetName: targetElement.name,
          },
        }, null, 2),
      }];
    }

    case 'archimate_list_relationships': {
      if (!currentModel) {
        return [{ type: 'text', text: 'Error: No model is currently open' }];
      }

      let relationships = currentModel.relationships;

      if (args.element_id) {
        const direction = (args.direction as string) || 'both';
        relationships = getRelationshipsForElement(currentModel, args.element_id as string, direction as 'incoming' | 'outgoing' | 'both');
      }

      if (args.relationship_type) {
        relationships = relationships.filter(r => r.type === args.relationship_type);
      }

      return [{
        type: 'text',
        text: JSON.stringify(relationships.map(r => {
          const source = getElementById(currentModel!, r.sourceId);
          const target = getElementById(currentModel!, r.targetId);
          return {
            id: r.id,
            type: r.type,
            sourceId: r.sourceId,
            sourceName: source?.name || 'Unknown',
            targetId: r.targetId,
            targetName: target?.name || 'Unknown',
            name: r.name,
          };
        }), null, 2),
      }];
    }

    case 'archimate_get_valid_relationships': {
      const sourceType = args.source_type as ElementType;
      const targetType = args.target_type as ElementType | undefined;

      if (targetType) {
        const validTypes = getValidRelationshipTypes(sourceType, targetType);
        return [{
          type: 'text',
          text: JSON.stringify({
            sourceType,
            targetType,
            validRelationships: validTypes.map(t => ({
              type: t,
              description: RelationshipDescriptions[t],
            })),
            guidance: getRelationshipGuidance(sourceType, targetType),
          }, null, 2),
        }];
      } else {
        return [{
          type: 'text',
          text: getRelationshipGuidance(sourceType),
        }];
      }
    }

    // -------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------
    case 'archimate_list_views': {
      if (!currentModel) {
        return [{ type: 'text', text: 'Error: No model is currently open' }];
      }

      return [{
        type: 'text',
        text: JSON.stringify(currentModel.diagrams.map(d => ({
          id: d.id,
          name: d.name,
          objectCount: d.objects.length,
        })), null, 2),
      }];
    }

    case 'archimate_create_view': {
      if (!currentModel) {
        return [{ type: 'text', text: 'Error: No model is currently open' }];
      }

      const diagram: ArchiMateDiagram = {
        id: generateId(),
        name: args.name as string,
        viewpoint: args.viewpoint as string | undefined,
        objects: [],
      };

      addDiagramToModel(currentModel, diagram);

      return [{
        type: 'text',
        text: JSON.stringify({
          message: 'View created successfully',
          view: diagram,
        }, null, 2),
      }];
    }

    case 'archimate_add_to_view': {
      if (!currentModel) {
        return [{ type: 'text', text: 'Error: No model is currently open' }];
      }

      const diagram = currentModel.diagrams.find(d => d.id === args.view_id);
      if (!diagram) {
        return [{ type: 'text', text: `Error: View not found: ${args.view_id}` }];
      }

      const element = getElementById(currentModel, args.element_id as string);
      if (!element) {
        return [{ type: 'text', text: `Error: Element not found: ${args.element_id}` }];
      }

      // Calculate position
      const existingCount = diagram.objects.length;
      const defaultX = (existingCount % 5) * 150 + 50;
      const defaultY = Math.floor(existingCount / 5) * 100 + 50;

      const diagObj: DiagramObject = {
        id: generateId(),
        elementId: args.element_id as string,
        bounds: {
          x: (args.x as number) ?? defaultX,
          y: (args.y as number) ?? defaultY,
          width: (args.width as number) ?? 120,
          height: (args.height as number) ?? 55,
        },
      };

      diagram.objects.push(diagObj);

      return [{
        type: 'text',
        text: JSON.stringify({
          message: 'Element added to view',
          diagramObject: diagObj,
          elementName: element.name,
        }, null, 2),
      }];
    }

    case 'archimate_add_connection_to_view': {
      if (!currentModel) {
        return [{ type: 'text', text: 'Error: No model is currently open' }];
      }

      const diagram = currentModel.diagrams.find(d => d.id === args.view_id);
      if (!diagram) {
        return [{ type: 'text', text: `Error: View not found: ${args.view_id}` }];
      }

      const relationshipId = args.relationship_id as string;
      const relationship = currentModel.relationships.find(r => r.id === relationshipId);
      if (!relationship) {
        return [{ type: 'text', text: `Error: Relationship not found: ${relationshipId}` }];
      }

      const sourceDiagObjId = args.source_diagram_object_id as string;
      const targetDiagObjId = args.target_diagram_object_id as string;

      const sourceDiagObj = diagram.objects.find(o => o.id === sourceDiagObjId);
      const targetDiagObj = diagram.objects.find(o => o.id === targetDiagObjId);

      if (!sourceDiagObj) {
        return [{ type: 'text', text: `Error: Source diagram object not found: ${sourceDiagObjId}` }];
      }
      if (!targetDiagObj) {
        return [{ type: 'text', text: `Error: Target diagram object not found: ${targetDiagObjId}` }];
      }

      // Create the connection
      const connectionId = generateId();
      const connection: DiagramConnection = {
        id: connectionId,
        sourceId: sourceDiagObjId,
        targetId: targetDiagObjId,
        relationshipId: relationshipId,
      };

      // Add connection to source object's sourceConnections
      if (!sourceDiagObj.sourceConnections) {
        sourceDiagObj.sourceConnections = [];
      }
      sourceDiagObj.sourceConnections.push(connection);

      // Add connection ID to target object's targetConnectionIds
      if (!targetDiagObj.targetConnectionIds) {
        targetDiagObj.targetConnectionIds = [];
      }
      targetDiagObj.targetConnectionIds.push(connectionId);

      return [{
        type: 'text',
        text: JSON.stringify({
          message: 'Connection added to view',
          connection: {
            id: connectionId,
            relationshipId: relationshipId,
            relationshipType: relationship.type,
            sourceDiagramObjectId: sourceDiagObjId,
            targetDiagramObjectId: targetDiagObjId,
          },
        }, null, 2),
      }];
    }

    // -------------------------------------------------------------------------
    // Modification
    // -------------------------------------------------------------------------
    case 'archimate_update_element': {
      if (!currentModel) {
        return [{ type: 'text', text: 'Error: No model is currently open' }];
      }

      const elementId = args.element_id as string;
      const updates: Partial<Pick<ArchiMateElement, 'name' | 'documentation'>> = {};

      if (args.name) updates.name = args.name as string;
      if (args.documentation !== undefined) updates.documentation = args.documentation as string;

      updateElementInModel(currentModel, elementId, updates);

      const updated = getElementById(currentModel, elementId);
      return [{
        type: 'text',
        text: JSON.stringify({
          message: 'Element updated successfully',
          element: updated,
        }, null, 2),
      }];
    }

    case 'archimate_delete_element': {
      if (!currentModel) {
        return [{ type: 'text', text: 'Error: No model is currently open' }];
      }

      const element = getElementById(currentModel, args.element_id as string);
      if (!element) {
        return [{ type: 'text', text: `Error: Element not found: ${args.element_id}` }];
      }

      const removedRels = getRelationshipsForElement(currentModel, args.element_id as string);
      removeElementFromModel(currentModel, args.element_id as string);

      return [{
        type: 'text',
        text: JSON.stringify({
          message: 'Element deleted successfully',
          deletedElement: element.name,
          removedRelationships: removedRels.length,
        }, null, 2),
      }];
    }

    case 'archimate_delete_relationship': {
      if (!currentModel) {
        return [{ type: 'text', text: 'Error: No model is currently open' }];
      }

      const rel = currentModel.relationships.find(r => r.id === args.relationship_id);
      if (!rel) {
        return [{ type: 'text', text: `Error: Relationship not found: ${args.relationship_id}` }];
      }

      removeRelationshipFromModel(currentModel, args.relationship_id as string);

      return [{
        type: 'text',
        text: JSON.stringify({
          message: 'Relationship deleted successfully',
          deletedRelationship: rel.type,
        }, null, 2),
      }];
    }

    // -------------------------------------------------------------------------
    // Analysis
    // -------------------------------------------------------------------------
    case 'archimate_layer_summary': {
      if (!currentModel) {
        return [{ type: 'text', text: 'Error: No model is currently open' }];
      }

      const elements = getAllElements(currentModel);
      const summary: Record<string, Record<string, number>> = {};

      for (const elem of elements) {
        const layer = getLayerForElementType(elem.type);
        if (!summary[layer]) summary[layer] = {};
        summary[layer][elem.type] = (summary[layer][elem.type] || 0) + 1;
      }

      return [{
        type: 'text',
        text: JSON.stringify({
          modelName: currentModel.name,
          totalElements: elements.length,
          totalRelationships: currentModel.relationships.length,
          totalViews: currentModel.diagrams.length,
          byLayer: summary,
        }, null, 2),
      }];
    }

    case 'archimate_impact_analysis': {
      if (!currentModel) {
        return [{ type: 'text', text: 'Error: No model is currently open' }];
      }

      const elementId = args.element_id as string;
      const direction = (args.direction as 'incoming' | 'outgoing' | 'both') || 'both';
      const maxDepth = (args.depth as number) || 2;

      const rootElement = getElementById(currentModel, elementId);
      if (!rootElement) {
        return [{ type: 'text', text: `Error: Element not found: ${elementId}` }];
      }

      const visited = new Set<string>();
      const impact: Array<{
        depth: number;
        direction: string;
        relationship: string;
        elementId: string;
        elementName: string;
        elementType: string;
      }> = [];

      function analyze(id: string, depth: number): void {
        if (depth > maxDepth || visited.has(id)) return;
        visited.add(id);

        const rels = getRelationshipsForElement(currentModel!, id, direction);
        for (const rel of rels) {
          const isSource = rel.sourceId === id;
          const otherId = isSource ? rel.targetId : rel.sourceId;

          if (!visited.has(otherId)) {
            const other = getElementById(currentModel!, otherId);
            impact.push({
              depth,
              direction: isSource ? 'outgoing' : 'incoming',
              relationship: rel.type,
              elementId: otherId,
              elementName: other?.name || 'Unknown',
              elementType: other?.type || 'Unknown',
            });
            analyze(otherId, depth + 1);
          }
        }
      }

      analyze(elementId, 1);

      return [{
        type: 'text',
        text: JSON.stringify({
          rootElement: {
            id: rootElement.id,
            name: rootElement.name,
            type: rootElement.type,
          },
          direction,
          maxDepth,
          impactedElements: impact,
          totalImpacted: impact.length,
        }, null, 2),
      }];
    }

    default:
      return [{ type: 'text', text: `Unknown tool: ${name}` }];
  }
}

// =============================================================================
// Server Setup
// =============================================================================

const server = new Server(
  {
    name: 'archimate-mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await handleToolCall(name, args as Record<string, unknown>);
    return { content: result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'archimate://spec/elements',
      name: 'ArchiMate Element Types',
      description: 'Catalog of all ArchiMate 3.2 element types by layer',
      mimeType: 'application/json',
    },
    {
      uri: 'archimate://spec/relationships',
      name: 'ArchiMate Relationship Types',
      description: 'Catalog of all ArchiMate 3.2 relationship types',
      mimeType: 'application/json',
    },
    {
      uri: 'archimate://model/summary',
      name: 'Current Model Summary',
      description: 'Summary of the currently loaded model',
      mimeType: 'application/json',
    },
  ],
}));

// Read resources
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case 'archimate://spec/elements':
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            Motivation: MotivationElementTypes.map(t => ({ type: t, description: ElementDescriptions[t] })),
            Strategy: StrategyElementTypes.map(t => ({ type: t, description: ElementDescriptions[t] })),
            Business: BusinessElementTypes.map(t => ({ type: t, description: ElementDescriptions[t] })),
            Application: ApplicationElementTypes.map(t => ({ type: t, description: ElementDescriptions[t] })),
            Technology: TechnologyElementTypes.map(t => ({ type: t, description: ElementDescriptions[t] })),
            Implementation: ImplementationElementTypes.map(t => ({ type: t, description: ElementDescriptions[t] })),
            Composite: CompositeElementTypes.map(t => ({ type: t, description: ElementDescriptions[t] })),
          }, null, 2),
        }],
      };

    case 'archimate://spec/relationships':
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            RelationshipTypes.map(t => ({
              type: t,
              description: RelationshipDescriptions[t],
            })),
            null, 2
          ),
        }],
      };

    case 'archimate://model/summary':
      if (!currentModel) {
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ error: 'No model loaded' }),
          }],
        };
      }
      const elements = getAllElements(currentModel);
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            name: currentModel.name,
            id: currentModel.id,
            elements: elements.length,
            relationships: currentModel.relationships.length,
            views: currentModel.diagrams.length,
          }, null, 2),
        }],
      };

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});

// Start the server
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ArchiMate MCP Server running on stdio');
}

main().catch(console.error);
