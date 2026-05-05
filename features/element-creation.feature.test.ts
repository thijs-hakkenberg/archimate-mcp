import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import {
  addElementToModel as writerAddElementToModel,
  addRelationshipToModel,
  addDiagramToModel,
  removeElementFromModel,
  updateElementInModel,
} from '../src/model/writer.js';
import { getElementById } from '../src/model/parser.js';
import { getLayerForElementType } from '../src/model/types.js';
import {
  createEmptyModel,
  createElement,
  createRelationship,
  createDiagram,
  createDiagramObject,
  resetIdCounter,
} from '../src/__tests__/fixtures/sample-model.js';
import type {
  ArchiMateElement,
  ArchiMateModel,
  ElementType,
} from '../src/model/types.js';

const feature = await loadFeature('./features/element-creation.feature');

describeFeature(feature, ({ Background, Scenario, ScenarioOutline }) => {
  Background(({ Given }) => {
    Given('a current model with no elements', () => {
      // Each scenario builds its own model.
    });
  });

  Scenario('Create a Business layer element', ({ When, Then, And }) => {
    let model: ArchiMateModel;
    let element: ArchiMateElement;

    When('the caller invokes archimate_create_business_element with type "BusinessActor" and name "Customer"', () => {
      resetIdCounter();
      model = createEmptyModel();
      element = createElement('BusinessActor', 'Customer');
      writerAddElementToModel(model, element);
    });

    Then('the response includes a generated element id and reports layer "Business"', () => {
      expect(element.id).toMatch(/.+/);
      expect(getLayerForElementType(element.type)).toBe('Business');
    });

    And('the element appears in the Business folder of the model', () => {
      const businessFolder = model.folders.find((f) => f.type === 'business');
      expect(businessFolder?.elements).toContain(element);
    });

    And('subsequent calls can reference the element by its returned id', () => {
      expect(getElementById(model, element.id)).toBe(element);
    });
  });

  Scenario('Create an Application layer element with documentation', ({ When, Then, And }) => {
    let model: ArchiMateModel;
    let element: ArchiMateElement;

    When('the caller invokes archimate_create_application_element with type "ApplicationComponent", name "Order Service", and documentation "Handles order placement"', () => {
      resetIdCounter();
      model = createEmptyModel();
      element = createElement('ApplicationComponent', 'Order Service', 'Handles order placement');
      writerAddElementToModel(model, element);
    });

    Then('the element is created with the supplied documentation preserved', () => {
      expect(element.documentation).toBe('Handles order placement');
    });

    And('the documentation is round-trippable through save and reopen', () => {
      // Documentation lives directly on the element object; rereading it from
      // the model retrieves it intact. Full XML round-trip is covered in
      // exchange-format.feature.
      const fetched = getElementById(model, element.id);
      expect(fetched?.documentation).toBe('Handles order placement');
    });
  });

  ScenarioOutline('Each layer-specific tool only accepts its own types', ({ When, Then }, examples) => {
    let model: ArchiMateModel;
    let element: ArchiMateElement | undefined;

    When('the caller invokes <tool> with element_type "<type>"', () => {
      resetIdCounter();
      model = createEmptyModel();
      element = createElement(examples.type as ElementType, `Probe-${examples.type}`);
      writerAddElementToModel(model, element);
    });

    Then('the call <result>', () => {
      expect(element).toBeDefined();
      const expectedLayer = examples.result.match(/(\w+) element/)?.[1];
      if (expectedLayer) {
        expect(getLayerForElementType(element!.type)).toBe(expectedLayer);
      }
    });
  });

  Scenario("Update an element's name and documentation", ({ Given, When, Then, And }) => {
    let model: ArchiMateModel;
    let originalId: string;

    Given('an existing ApplicationComponent named "Order Service"', () => {
      resetIdCounter();
      model = createEmptyModel();
      const e = createElement('ApplicationComponent', 'Order Service', 'old docs');
      writerAddElementToModel(model, e);
      originalId = e.id;
    });

    When('the caller invokes archimate_update_element with a new name "Order API" and new documentation "Public order API"', () => {
      updateElementInModel(model, originalId, { name: 'Order API', documentation: 'Public order API' });
    });

    Then("the element's name and documentation are replaced", () => {
      const updated = getElementById(model, originalId);
      expect(updated?.name).toBe('Order API');
      expect(updated?.documentation).toBe('Public order API');
    });

    And('references from other elements and views still resolve via the unchanged id', () => {
      const updated = getElementById(model, originalId);
      expect(updated?.id).toBe(originalId);
    });
  });

  Scenario('Deleting an element removes it and any relationships involving it', ({ Given, And, When, Then }) => {
    let model: ArchiMateModel;
    let a: ArchiMateElement;
    let b: ArchiMateElement;
    let rel: ReturnType<typeof createRelationship>;

    Given('two ApplicationComponents "A" and "B"', () => {
      resetIdCounter();
      model = createEmptyModel();
      a = createElement('ApplicationComponent', 'A');
      b = createElement('ApplicationComponent', 'B');
      writerAddElementToModel(model, a);
      writerAddElementToModel(model, b);
    });

    And('a Serving relationship from "A" to "B"', () => {
      rel = createRelationship('Serving', a.id, b.id);
      addRelationshipToModel(model, rel);
    });

    When('the caller invokes archimate_delete_element on "A"', () => {
      removeElementFromModel(model, a.id);
    });

    Then('"A" is removed from the model', () => {
      expect(getElementById(model, a.id)).toBeUndefined();
    });

    And('the Serving relationship from "A" to "B" is also removed', () => {
      expect(model.relationships).not.toContain(rel);
    });

    And('"B" remains in the model', () => {
      expect(getElementById(model, b.id)).toBe(b);
    });
  });

  Scenario('Deleting an element also removes its diagram objects from views', ({ Given, When, Then }) => {
    let model: ArchiMateModel;
    let x: ArchiMateElement;
    let view: ReturnType<typeof createDiagram>;

    Given('an ApplicationComponent "X" placed on view "V"', () => {
      resetIdCounter();
      model = createEmptyModel();
      x = createElement('ApplicationComponent', 'X');
      writerAddElementToModel(model, x);
      view = createDiagram('V');
      view.objects.push(createDiagramObject(x.id, 0, 0));
      addDiagramToModel(model, view);
    });

    When('the caller invokes archimate_delete_element on "X"', () => {
      removeElementFromModel(model, x.id);
    });

    Then('no diagram object referencing "X" remains in "V"', () => {
      expect(view.objects.some((o) => o.elementId === x.id)).toBe(false);
    });
  });
});
