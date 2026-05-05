import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import {
  isValidRelationship,
  validateRelationship,
  getValidRelationshipTypes,
  getValidTargetTypes,
} from '../src/relationships/validation.js';
import { addRelationshipToModel, removeRelationshipFromModel } from '../src/model/writer.js';
import { getRelationshipsForElement } from '../src/model/parser.js';
import {
  createEmptyModel,
  createElement,
  createRelationship,
  createDiagram,
  createDiagramObject,
  createDiagramConnection,
  addElementToModel,
  resetIdCounter,
} from '../src/__tests__/fixtures/sample-model.js';
import type { ArchiMateElement, ArchiMateModel, ArchiMateRelationship } from '../src/model/types.js';

const feature = await loadFeature('./features/relationship-management.feature');

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('a current model', () => {
      // Each scenario builds its own model.
    });
  });

  Scenario('Create a valid Serving relationship between two application components', ({ Given, And, When, Then }) => {
    let model: ArchiMateModel;
    let orderApi: ArchiMateElement;
    let orderService: ArchiMateElement;
    let rel: ArchiMateRelationship | undefined;

    Given('an ApplicationComponent "Order API"', () => {
      resetIdCounter();
      model = createEmptyModel();
      orderApi = createElement('ApplicationComponent', 'Order API');
      addElementToModel(model, orderApi);
    });

    And('an ApplicationComponent "Order Service"', () => {
      orderService = createElement('ApplicationComponent', 'Order Service');
      addElementToModel(model, orderService);
    });

    When('the caller invokes archimate_create_relationship of type "Serving" from "Order API" to "Order Service"', () => {
      const validation = validateRelationship('ApplicationComponent', 'ApplicationComponent', 'Serving');
      expect(validation.valid).toBe(true);
      rel = createRelationship('Serving', orderApi.id, orderService.id);
      addRelationshipToModel(model, rel);
    });

    Then('the relationship is created and stored in the Relations folder', () => {
      expect(model.relationships).toContain(rel);
      const relationsFolder = model.folders.find((f) => f.type === 'relations');
      expect(relationsFolder).toBeDefined();
    });

    And('the response includes the relationship id, type, and both endpoint names', () => {
      expect(rel!.id).toMatch(/.+/);
      expect(rel!.type).toBe('Serving');
      expect(rel!.sourceId).toBe(orderApi.id);
      expect(rel!.targetId).toBe(orderService.id);
    });
  });

  Scenario('Create an Access relationship with an access_type modifier', ({ Given, And, When, Then }) => {
    let model: ArchiMateModel;
    let processOrder: ArchiMateElement;
    let orderData: ArchiMateElement;
    let rel: ArchiMateRelationship;

    Given('an ApplicationFunction "Process Order"', () => {
      resetIdCounter();
      model = createEmptyModel();
      processOrder = createElement('ApplicationFunction', 'Process Order');
      addElementToModel(model, processOrder);
    });

    And('a DataObject "Order Data"', () => {
      orderData = createElement('DataObject', 'Order Data');
      addElementToModel(model, orderData);
    });

    When('the caller invokes archimate_create_relationship of type "Access" from "Process Order" to "Order Data" with access_type "ReadWrite"', () => {
      const validation = validateRelationship('ApplicationFunction', 'DataObject', 'Access');
      expect(validation.valid).toBe(true);
      rel = {
        ...createRelationship('Access', processOrder.id, orderData.id),
        accessType: 'ReadWrite',
      };
      addRelationshipToModel(model, rel);
    });

    Then('the relationship is created with the ReadWrite access modifier preserved', () => {
      expect(rel.accessType).toBe('ReadWrite');
      expect(model.relationships).toContain(rel);
    });
  });

  Scenario('Create an Influence relationship with an influence_modifier', ({ Given, And, When, Then }) => {
    let model: ArchiMateModel;
    let driver: ArchiMateElement;
    let goal: ArchiMateElement;
    let rel: ArchiMateRelationship;

    Given('a Driver "Cost Pressure"', () => {
      resetIdCounter();
      model = createEmptyModel();
      driver = createElement('Driver', 'Cost Pressure');
      addElementToModel(model, driver);
    });

    And('a Goal "Reduce TCO"', () => {
      goal = createElement('Goal', 'Reduce TCO');
      addElementToModel(model, goal);
    });

    When('the caller invokes archimate_create_relationship of type "Influence" from "Cost Pressure" to "Reduce TCO" with influence_modifier {string}', (_ctx: unknown, modifier: string) => {
      const validation = validateRelationship('Driver', 'Goal', 'Influence');
      expect(validation.valid).toBe(true);
      rel = {
        ...createRelationship('Influence', driver.id, goal.id),
        influenceModifier: modifier as '++' | '+' | '0' | '-' | '--',
      };
      addRelationshipToModel(model, rel);
    });

    Then('the relationship is created with the strength modifier preserved', () => {
      expect(rel.influenceModifier).toBe('++');
      expect(model.relationships).toContain(rel);
    });
  });

  Scenario('Reject a relationship that ArchiMate 3.2 forbids', ({ Given, And, When, Then }) => {
    let model: ArchiMateModel;
    let validation: ReturnType<typeof validateRelationship>;
    const initialRelationshipCount: { value: number } = { value: 0 };

    Given('a DataObject "Order Data"', () => {
      resetIdCounter();
      model = createEmptyModel();
      addElementToModel(model, createElement('DataObject', 'Order Data'));
      initialRelationshipCount.value = model.relationships.length;
    });

    And('a BusinessActor "Customer"', () => {
      addElementToModel(model, createElement('BusinessActor', 'Customer'));
    });

    When('the caller invokes archimate_create_relationship of type "Assignment" from "Order Data" to "Customer"', () => {
      validation = validateRelationship('DataObject', 'BusinessActor', 'Assignment');
    });

    Then('the call returns an error stating Assignment is not valid between DataObject and BusinessActor', () => {
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('Assignment');
      expect(validation.error).toContain('DataObject');
      expect(validation.error).toContain('BusinessActor');
    });

    And('the error suggests valid alternatives such as Realization, Serving, Association, or Flow', () => {
      const suggestions = validation.suggestions ?? [];
      const hasUseful = suggestions.some((s) =>
        ['Realization', 'Serving', 'Association', 'Flow'].includes(s),
      );
      expect(hasUseful).toBe(true);
    });

    And('no relationship is added to the model', () => {
      expect(model.relationships.length).toBe(initialRelationshipCount.value);
    });
  });

  Scenario('Query valid relationship types for a source element type', ({ When, Then, And }) => {
    let allTargets: Array<{ targetType: string; relationships: string[] }>;

    When('the caller invokes archimate_get_valid_relationships with source_type "ApplicationComponent"', () => {
      const allElementTypes = ['BusinessActor', 'BusinessProcess', 'ApplicationComponent', 'ApplicationFunction', 'DataObject', 'Node'] as const;
      allTargets = allElementTypes
        .map((t) => ({ targetType: t, relationships: getValidRelationshipTypes('ApplicationComponent', t) }))
        .filter((entry) => entry.relationships.length > 0);
    });

    Then('the response lists every target element type that can be reached from ApplicationComponent', () => {
      expect(allTargets.length).toBeGreaterThan(0);
    });

    And('each target lists the relationship types that are valid for that pair', () => {
      for (const t of allTargets) {
        expect(t.relationships.length).toBeGreaterThan(0);
        for (const rt of t.relationships) {
          expect(isValidRelationship('ApplicationComponent', t.targetType as never, rt)).toBe(true);
        }
      }
    });
  });

  Scenario('Query valid relationship types for a specific source-target pair', ({ When, Then }) => {
    let valid: string[];

    When('the caller invokes archimate_get_valid_relationships with source_type "ApplicationComponent" and target_type "BusinessProcess"', () => {
      valid = getValidRelationshipTypes('ApplicationComponent', 'BusinessProcess');
    });

    Then('the response lists only the relationship types valid between those two element types', () => {
      expect(valid.length).toBeGreaterThan(0);
      for (const rt of valid) {
        expect(isValidRelationship('ApplicationComponent', 'BusinessProcess', rt as never)).toBe(true);
      }
    });
  });

  Scenario('List relationships filtered by element', ({ Given, When, Then, And }) => {
    let model: ArchiMateModel;
    let target: ArchiMateElement;
    let bothFiltered: ReturnType<typeof getRelationshipsForElement>;
    let incomingFiltered: ReturnType<typeof getRelationshipsForElement>;

    Given('an element "Order Service" with three incoming and two outgoing relationships', () => {
      resetIdCounter();
      model = createEmptyModel();
      target = createElement('ApplicationComponent', 'Order Service');
      addElementToModel(model, target);
      const peers = ['P1', 'P2', 'P3', 'D1', 'D2'].map((n) => {
        const e = createElement('ApplicationComponent', n);
        addElementToModel(model, e);
        return e;
      });
      // 3 incoming
      for (let i = 0; i < 3; i++) {
        model.relationships.push(createRelationship('Serving', peers[i].id, target.id));
      }
      // 2 outgoing
      for (let i = 3; i < 5; i++) {
        model.relationships.push(createRelationship('Serving', target.id, peers[i].id));
      }
    });

    When('the caller invokes archimate_list_relationships filtered by element id "Order Service" and direction "both"', () => {
      bothFiltered = getRelationshipsForElement(model, target.id, 'both');
    });

    Then('the response includes all five relationships and no others', () => {
      expect(bothFiltered).toHaveLength(5);
    });

    And('requesting direction "incoming" returns only the three incoming relationships', () => {
      incomingFiltered = getRelationshipsForElement(model, target.id, 'incoming');
      expect(incomingFiltered).toHaveLength(3);
      expect(incomingFiltered.every((r) => r.targetId === target.id)).toBe(true);
    });
  });

  Scenario('Delete a relationship', ({ Given, When, Then, And }) => {
    let model: ArchiMateModel;
    let rel: ArchiMateRelationship;

    Given('an existing Serving relationship between two components', () => {
      resetIdCounter();
      model = createEmptyModel();
      const a = createElement('ApplicationComponent', 'A');
      const b = createElement('ApplicationComponent', 'B');
      addElementToModel(model, a);
      addElementToModel(model, b);
      rel = createRelationship('Serving', a.id, b.id);
      addRelationshipToModel(model, rel);

      // place a connection visualizing rel into a view
      const view = createDiagram('V');
      const aObj = createDiagramObject(a.id, 0, 0);
      const bObj = createDiagramObject(b.id, 200, 0);
      const conn = createDiagramConnection(aObj.id, bObj.id, rel.id);
      aObj.sourceConnections = [conn];
      bObj.targetConnectionIds = [conn.id];
      view.objects.push(aObj, bObj);
      model.diagrams.push(view);
    });

    When('the caller invokes archimate_delete_relationship with that relationship id', () => {
      removeRelationshipFromModel(model, rel.id);
    });

    Then('the relationship is removed from the model', () => {
      expect(model.relationships).not.toContain(rel);
    });

    And('any diagram connections that visualized it are removed from every view', () => {
      const remainingConnections = model.diagrams.flatMap((d) =>
        d.objects.flatMap((o) => o.sourceConnections ?? []),
      );
      expect(remainingConnections.some((c) => c.relationshipId === rel.id)).toBe(false);
    });
  });
});
