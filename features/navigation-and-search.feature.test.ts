import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import {
  getAllElements,
  getElementById,
  getElementsByType,
  findElementsByName,
  getRelationshipsForElement,
} from '../src/model/parser.js';
import { getLayerForElementType } from '../src/model/types.js';
import {
  createEmptyModel,
  createElement,
  createRelationship,
  addElementToModel,
  resetIdCounter,
} from '../src/__tests__/fixtures/sample-model.js';
import type { ArchiMateElement, ArchiMateModel } from '../src/model/types.js';

const feature = await loadFeature('./features/navigation-and-search.feature');

function buildMixedLayerModel(): ArchiMateModel {
  resetIdCounter();
  const model = createEmptyModel();
  [
    createElement('BusinessActor', 'Customer'),
    createElement('BusinessProcess', 'Order Process'),
    createElement('BusinessProcess', 'Fulfillment Process'),
    createElement('ApplicationComponent', 'Order Service'),
    createElement('ApplicationComponent', 'Payment Service'),
    createElement('ApplicationFunction', 'Process Order'),
    createElement('Node', 'Web Server'),
    createElement('TechnologyService', 'Database Service'),
    createElement('Goal', 'Reduce TCO'),
  ].forEach((e) => addElementToModel(model, e));
  return model;
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('a current model with elements across multiple layers', () => {
      // Each scenario builds its own model.
    });
  });

  Scenario('List every element in the model', ({ When, Then, And }) => {
    let model: ArchiMateModel;
    let listed: Array<{ id: string; name: string; type: string; layer: string }>;

    When('the caller invokes archimate_list_elements with no filter', () => {
      model = buildMixedLayerModel();
      listed = getAllElements(model).map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        layer: getLayerForElementType(e.type),
      }));
    });

    Then('the response includes every element across all layers', () => {
      expect(listed.length).toBe(getAllElements(model).length);
      expect(new Set(listed.map((e) => e.layer))).toEqual(
        new Set(['Business', 'Application', 'Technology', 'Motivation']),
      );
    });

    And('each entry shows id, name, type, and layer', () => {
      for (const entry of listed) {
        expect(entry.id).toMatch(/.+/);
        expect(entry.name).toMatch(/.+/);
        expect(entry.type).toMatch(/.+/);
        expect(entry.layer).toMatch(/.+/);
      }
    });
  });

  Scenario('List elements filtered by layer', ({ When, Then, And }) => {
    let listed: ArchiMateElement[];

    When('the caller invokes archimate_list_elements with layer "Application"', () => {
      const model = buildMixedLayerModel();
      listed = getAllElements(model).filter((e) => getLayerForElementType(e.type) === 'Application');
    });

    Then('the response includes only Application layer elements', () => {
      expect(listed.length).toBeGreaterThan(0);
      expect(listed.every((e) => getLayerForElementType(e.type) === 'Application')).toBe(true);
    });

    And('no Business, Technology, Motivation, or Strategy elements appear', () => {
      const layers = new Set(listed.map((e) => getLayerForElementType(e.type)));
      expect(layers.has('Business')).toBe(false);
      expect(layers.has('Technology')).toBe(false);
      expect(layers.has('Motivation')).toBe(false);
      expect(layers.has('Strategy')).toBe(false);
    });
  });

  Scenario('List elements filtered by specific element type', ({ When, Then, And }) => {
    let listed: ArchiMateElement[];

    When('the caller invokes archimate_list_elements with element_type "BusinessActor"', () => {
      const model = buildMixedLayerModel();
      listed = getElementsByType(model, 'BusinessActor');
    });

    Then('the response includes only BusinessActor elements', () => {
      expect(listed.length).toBeGreaterThan(0);
      expect(listed.every((e) => e.type === 'BusinessActor')).toBe(true);
    });

    And('other Business types like BusinessProcess are excluded', () => {
      expect(listed.every((e) => e.type !== 'BusinessProcess')).toBe(true);
    });
  });

  Scenario('Get a single element with its relationships', ({ Given, When, Then, And }) => {
    let model: ArchiMateModel;
    let target: ArchiMateElement;
    let element: ArchiMateElement | undefined;
    let relationships: ReturnType<typeof getRelationshipsForElement>;

    Given('an ApplicationComponent "Order Service" with two outgoing and one incoming relationships', () => {
      resetIdCounter();
      model = createEmptyModel();
      target = createElement('ApplicationComponent', 'Order Service', 'Handles orders');
      const customer = createElement('BusinessActor', 'Customer');
      const orderProcess = createElement('BusinessProcess', 'Order Process');
      const webServer = createElement('Node', 'Web Server');
      [target, customer, orderProcess, webServer].forEach((e) => addElementToModel(model, e));
      model.relationships.push(
        createRelationship('Serving', target.id, orderProcess.id),
        createRelationship('Serving', target.id, customer.id),
        createRelationship('Assignment', webServer.id, target.id),
      );
    });

    When('the caller invokes archimate_get_element with that id', () => {
      element = getElementById(model, target.id);
      relationships = getRelationshipsForElement(model, target.id, 'both');
    });

    Then("the response includes the element's full attributes and documentation", () => {
      expect(element).toBeDefined();
      expect(element!.id).toBe(target.id);
      expect(element!.name).toBe('Order Service');
      expect(element!.type).toBe('ApplicationComponent');
      expect(element!.documentation).toBe('Handles orders');
    });

    And('the response lists all three relationships, marked by direction', () => {
      expect(relationships).toHaveLength(3);
      const outgoing = relationships.filter((r) => r.sourceId === target.id);
      const incoming = relationships.filter((r) => r.targetId === target.id);
      expect(outgoing).toHaveLength(2);
      expect(incoming).toHaveLength(1);
    });
  });

  Scenario('Find elements by name pattern (case-insensitive)', ({ Given, When, Then, And }) => {
    let model: ArchiMateModel;
    let matches: ArchiMateElement[];

    Given('elements named "Order Service", "Customer Order", and "Payment"', () => {
      resetIdCounter();
      model = createEmptyModel();
      [
        createElement('ApplicationComponent', 'Order Service'),
        createElement('BusinessObject', 'Customer Order'),
        createElement('ApplicationComponent', 'Payment'),
      ].forEach((e) => addElementToModel(model, e));
    });

    When('the caller invokes archimate_find_elements with pattern "order"', () => {
      matches = findElementsByName(model, 'order');
    });

    Then('the response includes both "Order Service" and "Customer Order"', () => {
      const names = matches.map((m) => m.name).sort();
      expect(names).toContain('Order Service');
      expect(names).toContain('Customer Order');
    });

    And('"Payment" is excluded', () => {
      expect(matches.map((m) => m.name)).not.toContain('Payment');
    });
  });

  Scenario('Find elements supports regex', ({ Given, When, Then, And }) => {
    let model: ArchiMateModel;
    let matches: ArchiMateElement[];

    Given('elements named "Service A", "Service B", and "Process"', () => {
      resetIdCounter();
      model = createEmptyModel();
      [
        createElement('ApplicationComponent', 'Service A'),
        createElement('ApplicationComponent', 'Service B'),
        createElement('BusinessProcess', 'Process'),
      ].forEach((e) => addElementToModel(model, e));
    });

    When('the caller invokes archimate_find_elements with pattern "^Service"', () => {
      matches = findElementsByName(model, '^Service');
    });

    Then('the response includes "Service A" and "Service B"', () => {
      const names = matches.map((m) => m.name).sort();
      expect(names).toEqual(['Service A', 'Service B']);
    });

    And('"Process" is excluded', () => {
      expect(matches.map((m) => m.name)).not.toContain('Process');
    });
  });

  Scenario('Find elements scoped to a layer', ({ Given, When, Then }) => {
    let model: ArchiMateModel;
    let matches: ArchiMateElement[];

    Given('an ApplicationComponent "Service" and a BusinessRole "Service"', () => {
      resetIdCounter();
      model = createEmptyModel();
      [
        createElement('ApplicationComponent', 'Service'),
        createElement('BusinessRole', 'Service'),
      ].forEach((e) => addElementToModel(model, e));
    });

    When('the caller invokes archimate_find_elements with pattern "Service" and layer "Application"', () => {
      matches = findElementsByName(model, 'Service').filter(
        (e) => getLayerForElementType(e.type) === 'Application',
      );
    });

    Then('only the ApplicationComponent is returned', () => {
      expect(matches).toHaveLength(1);
      expect(matches[0].type).toBe('ApplicationComponent');
    });
  });

  Scenario('Layer summary returns counts grouped by layer and element type', ({ Given, When, Then, And }) => {
    let model: ArchiMateModel;
    let summary: { totalElements: number; totalRelationships: number; totalViews: number; byLayer: Record<string, Record<string, number>> };

    Given('a model with 1 BusinessActor, 2 BusinessProcess, 5 ApplicationComponent, and 2 Node elements', () => {
      resetIdCounter();
      model = createEmptyModel();
      addElementToModel(model, createElement('BusinessActor', 'Actor1'));
      addElementToModel(model, createElement('BusinessProcess', 'Proc1'));
      addElementToModel(model, createElement('BusinessProcess', 'Proc2'));
      for (let i = 0; i < 5; i++) addElementToModel(model, createElement('ApplicationComponent', `App${i}`));
      addElementToModel(model, createElement('Node', 'Node1'));
      addElementToModel(model, createElement('Node', 'Node2'));
    });

    When('the caller invokes archimate_layer_summary', () => {
      const elements = getAllElements(model);
      const byLayer: Record<string, Record<string, number>> = {};
      for (const elem of elements) {
        const layer = getLayerForElementType(elem.type);
        byLayer[layer] = byLayer[layer] || {};
        byLayer[layer][elem.type] = (byLayer[layer][elem.type] || 0) + 1;
      }
      summary = {
        totalElements: elements.length,
        totalRelationships: model.relationships.length,
        totalViews: model.diagrams.length,
        byLayer,
      };
    });

    Then('the response includes totals for elements, relationships, and views', () => {
      expect(summary.totalElements).toBe(10);
      expect(summary.totalRelationships).toBe(0);
      expect(summary.totalViews).toBe(0);
    });

    And('the byLayer map reports per-element-type counts within each populated layer', () => {
      expect(Object.keys(summary.byLayer).sort()).toEqual(['Application', 'Business', 'Technology']);
    });

    And('byLayer["Business"] contains BusinessActor: 1 and BusinessProcess: 2', () => {
      expect(summary.byLayer.Business.BusinessActor).toBe(1);
      expect(summary.byLayer.Business.BusinessProcess).toBe(2);
    });

    And('byLayer["Application"] contains ApplicationComponent: 5', () => {
      expect(summary.byLayer.Application.ApplicationComponent).toBe(5);
    });

    And('byLayer["Technology"] contains Node: 2', () => {
      expect(summary.byLayer.Technology.Node).toBe(2);
    });

    And('layers with no elements (e.g. Motivation, Strategy) are omitted from byLayer', () => {
      expect(summary.byLayer.Motivation).toBeUndefined();
      expect(summary.byLayer.Strategy).toBeUndefined();
    });
  });
});
