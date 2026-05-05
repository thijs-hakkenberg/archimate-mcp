import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { autoConnectDiagramObject } from '../src/model/view-helpers.js';
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
import type {
  ArchiMateDiagram,
  ArchiMateModel,
  DiagramConnection,
  DiagramObject,
} from '../src/model/types.js';

const feature = await loadFeature('./features/view-construction.feature');

/**
 * Step bindings drive the behavior at the same level as the MCP handler:
 * they push a DiagramObject into the view, then call autoConnectDiagramObject
 * (the same helper invoked by archimate_add_to_view's handler in src/index.ts).
 * The returned `created` array is the same data the handler exposes to callers
 * as `autoConnectedRelationships`.
 */

describeFeature(feature, ({ Scenario, Background }) => {
  Background(({ Given }) => {
    Given('a current model', () => {
      // Each scenario re-initializes its own model in its first step.
    });
  });

  Scenario('Create an empty view', ({ When, Then, And }) => {
    let model: ArchiMateModel;
    let view: ArchiMateDiagram;

    When('the caller invokes archimate_create_view with name "Main View"', () => {
      resetIdCounter();
      model = createEmptyModel();
      view = createDiagram('Main View');
      model.diagrams.push(view);
    });

    Then('the view is created with no diagram objects', () => {
      expect(view.objects).toEqual([]);
    });

    And('the response includes the generated view id', () => {
      expect(view.id).toMatch(/.+/);
    });
  });

  Scenario('Add a single element to an empty view draws no connections', ({ Given, And, When, Then }) => {
    let model: ArchiMateModel;
    let view: ArchiMateDiagram;
    let elementA: ReturnType<typeof createElement>;
    let aObj: DiagramObject;
    let autoConnected: DiagramConnection[];

    Given('an empty view "V"', () => {
      resetIdCounter();
      model = createEmptyModel();
      view = createDiagram('V');
      model.diagrams.push(view);
    });

    And('an ApplicationComponent "A" with no relationships', () => {
      elementA = createElement('ApplicationComponent', 'A');
      addElementToModel(model, elementA);
    });

    When('the caller invokes archimate_add_to_view with view "V" and element "A"', () => {
      aObj = createDiagramObject(elementA.id, 50, 50);
      view.objects.push(aObj);
      autoConnected = autoConnectDiagramObject(model, view, aObj);
    });

    Then('"A" is placed on the canvas at an auto-assigned position', () => {
      expect(view.objects).toContain(aObj);
      expect(aObj.bounds.x).toBeTypeOf('number');
      expect(aObj.bounds.y).toBeTypeOf('number');
    });

    And('the response field autoConnectedRelationships is an empty list', () => {
      expect(autoConnected).toEqual([]);
    });
  });

  Scenario('Adding a second element auto-draws the relationship between them', ({ Given, And, When, Then }) => {
    let model: ArchiMateModel;
    let view: ArchiMateDiagram;
    let elementA: ReturnType<typeof createElement>;
    let elementB: ReturnType<typeof createElement>;
    let serving: ReturnType<typeof createRelationship>;
    let aObj: DiagramObject;
    let bObj: DiagramObject;
    let autoConnected: DiagramConnection[];

    Given('a view "V" containing diagram object for ApplicationComponent "A"', () => {
      resetIdCounter();
      model = createEmptyModel();
      elementA = createElement('ApplicationComponent', 'A');
      addElementToModel(model, elementA);
      view = createDiagram('V');
      model.diagrams.push(view);
      aObj = createDiagramObject(elementA.id, 50, 50);
      view.objects.push(aObj);
    });

    And('a Serving relationship from "A" to ApplicationComponent "B"', () => {
      elementB = createElement('ApplicationComponent', 'B');
      addElementToModel(model, elementB);
      serving = createRelationship('Serving', elementA.id, elementB.id);
      model.relationships.push(serving);
    });

    When('the caller invokes archimate_add_to_view with view "V" and element "B"', () => {
      bObj = createDiagramObject(elementB.id, 200, 50);
      view.objects.push(bObj);
      autoConnected = autoConnectDiagramObject(model, view, bObj);
    });

    Then("a diagram connection is drawn from A's diagram object to B's diagram object", () => {
      expect(autoConnected).toHaveLength(1);
      expect(autoConnected[0].sourceId).toBe(aObj.id);
      expect(autoConnected[0].targetId).toBe(bObj.id);
    });

    And('the connection\'s direction matches the relationship (source A, target B)', () => {
      expect(autoConnected[0].relationshipId).toBe(serving.id);
    });

    And("A's diagram object lists the new connection in sourceConnections", () => {
      expect(aObj.sourceConnections).toHaveLength(1);
      expect(aObj.sourceConnections![0].id).toBe(autoConnected[0].id);
    });

    And("B's diagram object lists the new connection's id in targetConnectionIds", () => {
      expect(bObj.targetConnectionIds).toEqual([autoConnected[0].id]);
    });

    And('autoConnectedRelationships contains exactly one entry referencing the Serving relationship', () => {
      expect(autoConnected.map((c) => c.relationshipId)).toEqual([serving.id]);
    });
  });

  Scenario('Auto-draw preserves direction when the new element is the relationship target', ({ Given, And, When, Then }) => {
    let model: ArchiMateModel;
    let view: ArchiMateDiagram;
    let elementA: ReturnType<typeof createElement>;
    let elementB: ReturnType<typeof createElement>;
    let aObj: DiagramObject;
    let bObj: DiagramObject;
    let autoConnected: DiagramConnection[];

    Given('a view "V" containing diagram object for ApplicationComponent "A"', () => {
      resetIdCounter();
      model = createEmptyModel();
      elementA = createElement('ApplicationComponent', 'A');
      addElementToModel(model, elementA);
      view = createDiagram('V');
      model.diagrams.push(view);
      aObj = createDiagramObject(elementA.id, 50, 50);
      view.objects.push(aObj);
    });

    And('a Serving relationship from ApplicationComponent "B" to "A"', () => {
      elementB = createElement('ApplicationComponent', 'B');
      addElementToModel(model, elementB);
      model.relationships.push(createRelationship('Serving', elementB.id, elementA.id));
    });

    When('the caller invokes archimate_add_to_view with view "V" and element "B"', () => {
      bObj = createDiagramObject(elementB.id, 200, 50);
      view.objects.push(bObj);
      autoConnected = autoConnectDiagramObject(model, view, bObj);
    });

    Then("a diagram connection is drawn from B's diagram object to A's diagram object", () => {
      expect(autoConnected).toHaveLength(1);
      expect(autoConnected[0].sourceId).toBe(bObj.id);
      expect(autoConnected[0].targetId).toBe(aObj.id);
    });
  });

  Scenario('Triangle of relationships produces three connections after three adds', ({ Given, And, When, Then }) => {
    let model: ArchiMateModel;
    let view: ArchiMateDiagram;
    let a: ReturnType<typeof createElement>;
    let b: ReturnType<typeof createElement>;
    let c: ReturnType<typeof createElement>;
    let totalConnections = 0;

    Given('relationships A→B, B→C, and A→C among three ApplicationComponents', () => {
      resetIdCounter();
      model = createEmptyModel();
      a = createElement('ApplicationComponent', 'A');
      b = createElement('ApplicationComponent', 'B');
      c = createElement('ApplicationComponent', 'C');
      [a, b, c].forEach((e) => addElementToModel(model, e));
      model.relationships.push(
        createRelationship('Serving', a.id, b.id),
        createRelationship('Serving', b.id, c.id),
        createRelationship('Serving', a.id, c.id),
      );
    });

    And('an empty view "V"', () => {
      view = createDiagram('V');
      model.diagrams.push(view);
    });

    When('the caller adds A, then B, then C to "V"', () => {
      for (const elem of [a, b, c]) {
        const obj = createDiagramObject(elem.id, 50, 50);
        view.objects.push(obj);
        totalConnections += autoConnectDiagramObject(model, view, obj).length;
      }
    });

    Then('the view contains exactly three diagram connections, one per relationship', () => {
      expect(totalConnections).toBe(3);
      const allConnections = view.objects.flatMap((o) => o.sourceConnections ?? []);
      expect(allConnections).toHaveLength(3);
    });

    And('no connection is duplicated', () => {
      const relIds = view.objects.flatMap((o) => o.sourceConnections ?? []).map((c) => c.relationshipId);
      expect(new Set(relIds).size).toBe(relIds.length);
    });
  });

  Scenario('Auto-draw is idempotent across repeated adds', ({ Given, When, Then, And }) => {
    let model: ArchiMateModel;
    let view: ArchiMateDiagram;
    let aObj: DiagramObject;
    let bObj: DiagramObject;
    let secondCall: DiagramConnection[];

    Given('a view that already contains diagram objects for "A" and "B" with a connection between them', () => {
      resetIdCounter();
      model = createEmptyModel();
      const a = createElement('ApplicationComponent', 'A');
      const b = createElement('ApplicationComponent', 'B');
      addElementToModel(model, a);
      addElementToModel(model, b);
      const rel = createRelationship('Serving', a.id, b.id);
      model.relationships.push(rel);

      view = createDiagram('V');
      model.diagrams.push(view);
      aObj = createDiagramObject(a.id, 50, 50);
      bObj = createDiagramObject(b.id, 200, 50);
      view.objects.push(aObj, bObj);

      const conn = createDiagramConnection(aObj.id, bObj.id, rel.id);
      aObj.sourceConnections = [conn];
      bObj.targetConnectionIds = [conn.id];
    });

    When('the caller invokes archimate_add_to_view again for "A"', () => {
      secondCall = autoConnectDiagramObject(model, view, aObj);
    });

    Then('no additional diagram connection is created', () => {
      expect(aObj.sourceConnections).toHaveLength(1);
      expect(bObj.targetConnectionIds).toHaveLength(1);
    });

    And('autoConnectedRelationships is empty', () => {
      expect(secondCall).toEqual([]);
    });
  });

  Scenario('Caller can opt out of auto-drawing', ({ Given, And, When, Then }) => {
    let model: ArchiMateModel;
    let view: ArchiMateDiagram;
    let elementB: ReturnType<typeof createElement>;
    let bObj: DiagramObject;
    let autoConnected: DiagramConnection[];
    const autoConnect = false;

    Given('a view containing diagram object for "A"', () => {
      resetIdCounter();
      model = createEmptyModel();
      const a = createElement('ApplicationComponent', 'A');
      addElementToModel(model, a);
      view = createDiagram('V');
      model.diagrams.push(view);
      view.objects.push(createDiagramObject(a.id, 50, 50));
      // Stash for next step
      (model as ArchiMateModel & { _aId?: string })._aId = a.id;
    });

    And('a relationship from "A" to "B"', () => {
      elementB = createElement('ApplicationComponent', 'B');
      addElementToModel(model, elementB);
      const aId = (model as ArchiMateModel & { _aId?: string })._aId!;
      model.relationships.push(createRelationship('Serving', aId, elementB.id));
    });

    When('the caller invokes archimate_add_to_view with element "B" and auto_connect set to false', () => {
      bObj = createDiagramObject(elementB.id, 200, 50);
      view.objects.push(bObj);
      autoConnected = autoConnect ? autoConnectDiagramObject(model, view, bObj) : [];
    });

    Then('"B" is placed on the canvas with no connections drawn', () => {
      expect(view.objects).toContain(bObj);
      expect(bObj.sourceConnections ?? []).toEqual([]);
      expect(bObj.targetConnectionIds ?? []).toEqual([]);
    });

    And('autoConnectedRelationships is empty', () => {
      expect(autoConnected).toEqual([]);
    });
  });

  Scenario('Manually add a connection between two on-canvas elements', ({ Given, And, When, Then }) => {
    let model: ArchiMateModel;
    let view: ArchiMateDiagram;
    let aObj: DiagramObject;
    let bObj: DiagramObject;
    let rel: ReturnType<typeof createRelationship>;
    let manual: DiagramConnection;

    Given('a view containing diagram objects for "A" and "B" with no connection between them', () => {
      resetIdCounter();
      model = createEmptyModel();
      const a = createElement('ApplicationComponent', 'A');
      const b = createElement('ApplicationComponent', 'B');
      addElementToModel(model, a);
      addElementToModel(model, b);
      view = createDiagram('V');
      model.diagrams.push(view);
      aObj = createDiagramObject(a.id, 50, 50);
      bObj = createDiagramObject(b.id, 200, 50);
      view.objects.push(aObj, bObj);
      // Stash element ids
      (model as ArchiMateModel & { _ids?: { a: string; b: string } })._ids = { a: a.id, b: b.id };
    });

    And('a relationship between "A" and "B"', () => {
      const ids = (model as ArchiMateModel & { _ids?: { a: string; b: string } })._ids!;
      rel = createRelationship('Serving', ids.a, ids.b);
      model.relationships.push(rel);
    });

    When('the caller invokes archimate_add_connection_to_view with the relationship and both diagram-object ids', () => {
      manual = createDiagramConnection(aObj.id, bObj.id, rel.id);
      aObj.sourceConnections = [manual];
      bObj.targetConnectionIds = [manual.id];
    });

    Then('a diagram connection is added with the supplied orientation', () => {
      expect(aObj.sourceConnections).toHaveLength(1);
      expect(aObj.sourceConnections![0].sourceId).toBe(aObj.id);
      expect(aObj.sourceConnections![0].targetId).toBe(bObj.id);
    });

    And('subsequent auto-draws skip this relationship to avoid duplication', () => {
      const created = autoConnectDiagramObject(model, view, aObj);
      expect(created).toEqual([]);
    });
  });

  Scenario('List all views in the model', ({ When, Then }) => {
    let model: ArchiMateModel;
    let listed: Array<{ id: string; name: string; viewpoint?: string }>;

    When('the caller invokes archimate_list_views', () => {
      resetIdCounter();
      model = createEmptyModel();
      const v1 = createDiagram('Layered View');
      const v2 = createDiagram('Application Cooperation');
      model.diagrams.push(v1, v2);
      listed = model.diagrams.map((d) => ({
        id: d.id,
        name: d.name,
        viewpoint: d.viewpoint,
      }));
    });

    Then("the response includes every diagram view's id, name, and viewpoint", () => {
      expect(listed).toHaveLength(2);
      for (const v of listed) {
        expect(v.id).toMatch(/.+/);
        expect(v.name).toMatch(/.+/);
      }
    });
  });
});
