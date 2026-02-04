/**
 * Test model factory for creating sample ArchiMate models
 */

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
} from '../../model/types.js';

let idCounter = 0;

function generateTestId(prefix: string = 'id'): string {
  return `${prefix}-test-${++idCounter}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

/**
 * Create a minimal empty model
 */
export function createEmptyModel(name: string = 'Test Model'): ArchiMateModel {
  return {
    id: generateTestId('model'),
    name,
    version: '5.0.0',
    documentation: 'Test model for unit tests',
    folders: [
      createFolder('motivation', 'Motivation'),
      createFolder('strategy', 'Strategy'),
      createFolder('business', 'Business'),
      createFolder('application', 'Application'),
      createFolder('technology', 'Technology'),
      createFolder('implementation_migration', 'Implementation & Migration'),
      createFolder('other', 'Other'),
      createFolder('relations', 'Relations'),
      createFolder('diagrams', 'Views'),
    ],
    relationships: [],
    diagrams: [],
  };
}

function createFolder(type: string, name: string): ArchiMateFolder {
  return {
    id: generateTestId('folder'),
    name,
    type,
    elements: [],
    subfolders: [],
  };
}

/**
 * Create a basic test element
 */
export function createElement(
  type: ElementType,
  name: string,
  documentation?: string
): ArchiMateElement {
  return {
    id: generateTestId('element'),
    type,
    name,
    documentation,
    properties: [],
  };
}

/**
 * Create a basic test relationship
 */
export function createRelationship(
  type: RelationshipType,
  sourceId: string,
  targetId: string,
  name?: string
): ArchiMateRelationship {
  return {
    id: generateTestId('rel'),
    type,
    sourceId,
    targetId,
    name,
    properties: [],
  };
}

/**
 * Create a diagram object for an element
 */
export function createDiagramObject(
  elementId: string,
  x: number,
  y: number,
  width: number = 120,
  height: number = 55
): DiagramObject {
  return {
    id: generateTestId('diag-obj'),
    elementId,
    bounds: { x, y, width, height },
    sourceConnections: [],
    children: [],
  };
}

/**
 * Create a diagram connection
 */
export function createDiagramConnection(
  sourceId: string,
  targetId: string,
  relationshipId: string
): DiagramConnection {
  return {
    id: generateTestId('conn'),
    sourceId,
    targetId,
    relationshipId,
  };
}

/**
 * Create a basic diagram view
 */
export function createDiagram(
  name: string,
  objects: DiagramObject[] = []
): ArchiMateDiagram {
  return {
    id: generateTestId('view'),
    name,
    viewpoint: 'Layered',
    objects,
  };
}

/**
 * Add element to model in appropriate folder
 */
export function addElementToModel(model: ArchiMateModel, element: ArchiMateElement): void {
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

  const folderType = folderMap[element.type] || 'other';
  const folder = model.folders.find((f) => f.type === folderType);
  if (folder) {
    folder.elements.push(element);
  }
}

/**
 * Create a comprehensive test model with elements from multiple layers
 */
export function createTestModel(): ArchiMateModel {
  resetIdCounter();
  const model = createEmptyModel('Test Architecture Model');

  // Business layer elements
  const customer = createElement('BusinessActor', 'Customer', 'External customer');
  const salesRole = createElement('BusinessRole', 'Sales Representative', 'Handles customer sales');
  const orderProcess = createElement('BusinessProcess', 'Order Process', 'Handles customer orders');
  const orderService = createElement('BusinessService', 'Order Service', 'Exposed order functionality');
  const orderObject = createElement('BusinessObject', 'Order', 'Customer order data');

  // Application layer elements
  const orderApp = createElement('ApplicationComponent', 'Order Application', 'Main order management app');
  const orderFunction = createElement('ApplicationFunction', 'Process Order', 'Automated order processing');
  const appService = createElement('ApplicationService', 'Order API', 'REST API for orders');
  const orderData = createElement('DataObject', 'Order Data', 'Structured order information');

  // Technology layer elements
  const webServer = createElement('Node', 'Web Server', 'Application server');
  const database = createElement('Device', 'Database Server', 'PostgreSQL database');
  const techService = createElement('TechnologyService', 'Database Service', 'Data persistence service');

  // Add elements to model
  [customer, salesRole, orderProcess, orderService, orderObject].forEach((e) =>
    addElementToModel(model, e)
  );
  [orderApp, orderFunction, appService, orderData].forEach((e) =>
    addElementToModel(model, e)
  );
  [webServer, database, techService].forEach((e) => addElementToModel(model, e));

  // Create relationships
  const relationships: ArchiMateRelationship[] = [
    createRelationship('Assignment', customer.id, orderProcess.id, 'initiates'),
    createRelationship('Assignment', salesRole.id, orderProcess.id, 'performs'),
    createRelationship('Realization', orderProcess.id, orderService.id),
    createRelationship('Access', orderProcess.id, orderObject.id),
    createRelationship('Serving', appService.id, orderService.id),
    createRelationship('Realization', orderFunction.id, appService.id),
    createRelationship('Composition', orderApp.id, orderFunction.id),
    createRelationship('Access', orderFunction.id, orderData.id),
    createRelationship('Assignment', webServer.id, orderApp.id),
    createRelationship('Serving', techService.id, orderApp.id),
    createRelationship('Assignment', database.id, techService.id),
  ];

  model.relationships = relationships;

  return model;
}

/**
 * Create a test model with a diagram view
 */
export function createTestModelWithView(): ArchiMateModel {
  resetIdCounter();
  const model = createTestModel();

  // Get elements for the view
  const allElements = getAllElements(model);
  const customer = allElements.find((e) => e.name === 'Customer')!;
  const orderProcess = allElements.find((e) => e.name === 'Order Process')!;
  const orderService = allElements.find((e) => e.name === 'Order Service')!;
  const orderApp = allElements.find((e) => e.name === 'Order Application')!;
  const appService = allElements.find((e) => e.name === 'Order API')!;
  const webServer = allElements.find((e) => e.name === 'Web Server')!;

  // Create diagram objects with positions
  const customerObj = createDiagramObject(customer.id, 50, 50);
  const processObj = createDiagramObject(orderProcess.id, 200, 50);
  const serviceObj = createDiagramObject(orderService.id, 350, 50);
  const appObj = createDiagramObject(orderApp.id, 200, 150);
  const apiObj = createDiagramObject(appService.id, 350, 150);
  const serverObj = createDiagramObject(webServer.id, 200, 250);

  // Find relationships for connections
  const customerToProcess = model.relationships.find(
    (r) => r.sourceId === customer.id && r.targetId === orderProcess.id
  )!;
  const appServiceToOrderService = model.relationships.find(
    (r) => r.sourceId === appService.id && r.targetId === orderService.id
  )!;
  const serverToApp = model.relationships.find(
    (r) => r.sourceId === webServer.id && r.targetId === orderApp.id
  )!;

  // Add connections to source objects
  customerObj.sourceConnections = [
    createDiagramConnection(customerObj.id, processObj.id, customerToProcess.id),
  ];
  apiObj.sourceConnections = [
    createDiagramConnection(apiObj.id, serviceObj.id, appServiceToOrderService.id),
  ];
  serverObj.sourceConnections = [
    createDiagramConnection(serverObj.id, appObj.id, serverToApp.id),
  ];

  // Create the diagram
  const diagram = createDiagram('Main Architecture View', [
    customerObj,
    processObj,
    serviceObj,
    appObj,
    apiObj,
    serverObj,
  ]);

  model.diagrams.push(diagram);

  return model;
}

/**
 * Create a minimal model with just a few elements for simple tests
 */
export function createMinimalModel(): ArchiMateModel {
  resetIdCounter();
  const model = createEmptyModel('Minimal Test Model');

  const actor = createElement('BusinessActor', 'User', 'End user');
  const process = createElement('BusinessProcess', 'Main Process', 'Core process');
  const service = createElement('ApplicationService', 'API Service', 'REST API');

  addElementToModel(model, actor);
  addElementToModel(model, process);
  addElementToModel(model, service);

  model.relationships = [
    createRelationship('Assignment', actor.id, process.id),
    createRelationship('Serving', service.id, process.id),
  ];

  return model;
}

/**
 * Get all elements from all folders in the model
 */
export function getAllElements(model: ArchiMateModel): ArchiMateElement[] {
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
export function getElementById(model: ArchiMateModel, id: string): ArchiMateElement | undefined {
  return getAllElements(model).find((e) => e.id === id);
}

/**
 * Get relationships for an element
 */
export function getRelationshipsForElement(
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
