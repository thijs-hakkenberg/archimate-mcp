import { describe, it, expect, beforeEach } from 'vitest';
import { autoConnectDiagramObject } from './view-helpers.js';
import type { ArchiMateDiagram, ArchiMateModel, DiagramObject } from './types.js';
import {
  createEmptyModel,
  createElement,
  createRelationship,
  createDiagram,
  createDiagramObject,
  createDiagramConnection,
  addElementToModel,
  resetIdCounter,
} from '../__tests__/fixtures/sample-model.js';

function addObjectToDiagram(diagram: ArchiMateDiagram, obj: DiagramObject): DiagramObject {
  diagram.objects.push(obj);
  return obj;
}

describe('autoConnectDiagramObject', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it('returns an empty list and adds nothing when the diagram has no other objects', () => {
    const model = createEmptyModel();
    const a = createElement('ApplicationComponent', 'A');
    addElementToModel(model, a);

    const diagram = createDiagram('V');
    model.diagrams.push(diagram);
    const aObj = addObjectToDiagram(diagram, createDiagramObject(a.id, 0, 0));

    const created = autoConnectDiagramObject(model, diagram, aObj);

    expect(created).toEqual([]);
    expect(aObj.sourceConnections ?? []).toEqual([]);
  });

  it('auto-draws a connection when the new object has an outgoing relationship to a peer already on the canvas', () => {
    const model = createEmptyModel();
    const a = createElement('ApplicationComponent', 'A');
    const b = createElement('ApplicationComponent', 'B');
    addElementToModel(model, a);
    addElementToModel(model, b);
    const rel = createRelationship('Serving', a.id, b.id);
    model.relationships.push(rel);

    const diagram = createDiagram('V');
    model.diagrams.push(diagram);
    const bObj = addObjectToDiagram(diagram, createDiagramObject(b.id, 200, 0));
    const aObj = addObjectToDiagram(diagram, createDiagramObject(a.id, 0, 0));

    const created = autoConnectDiagramObject(model, diagram, aObj);

    expect(created).toHaveLength(1);
    expect(created[0].relationshipId).toBe(rel.id);
    expect(created[0].sourceId).toBe(aObj.id);
    expect(created[0].targetId).toBe(bObj.id);
    expect(aObj.sourceConnections).toHaveLength(1);
    expect(aObj.sourceConnections![0].id).toBe(created[0].id);
    expect(bObj.targetConnectionIds).toEqual([created[0].id]);
  });

  it('preserves relationship direction when the new object is the relationship target', () => {
    const model = createEmptyModel();
    const a = createElement('ApplicationComponent', 'A');
    const b = createElement('ApplicationComponent', 'B');
    addElementToModel(model, a);
    addElementToModel(model, b);
    const rel = createRelationship('Serving', a.id, b.id);
    model.relationships.push(rel);

    const diagram = createDiagram('V');
    model.diagrams.push(diagram);
    const aObj = addObjectToDiagram(diagram, createDiagramObject(a.id, 0, 0));
    const bObj = addObjectToDiagram(diagram, createDiagramObject(b.id, 200, 0));

    const created = autoConnectDiagramObject(model, diagram, bObj);

    expect(created).toHaveLength(1);
    expect(created[0].sourceId).toBe(aObj.id);
    expect(created[0].targetId).toBe(bObj.id);
    expect(aObj.sourceConnections).toHaveLength(1);
    expect(bObj.targetConnectionIds).toEqual([created[0].id]);
  });

  it('draws all connections in a triangle of three mutually related elements', () => {
    const model = createEmptyModel();
    const a = createElement('ApplicationComponent', 'A');
    const b = createElement('ApplicationComponent', 'B');
    const c = createElement('ApplicationComponent', 'C');
    [a, b, c].forEach((e) => addElementToModel(model, e));
    const rAB = createRelationship('Serving', a.id, b.id);
    const rBC = createRelationship('Serving', b.id, c.id);
    const rAC = createRelationship('Serving', a.id, c.id);
    model.relationships.push(rAB, rBC, rAC);

    const diagram = createDiagram('V');
    model.diagrams.push(diagram);

    const aObj = addObjectToDiagram(diagram, createDiagramObject(a.id, 0, 0));
    const createdForA = autoConnectDiagramObject(model, diagram, aObj);
    expect(createdForA).toEqual([]);

    const bObj = addObjectToDiagram(diagram, createDiagramObject(b.id, 200, 0));
    const createdForB = autoConnectDiagramObject(model, diagram, bObj);
    expect(createdForB).toHaveLength(1);
    expect(createdForB[0].relationshipId).toBe(rAB.id);

    const cObj = addObjectToDiagram(diagram, createDiagramObject(c.id, 400, 0));
    const createdForC = autoConnectDiagramObject(model, diagram, cObj);
    expect(createdForC).toHaveLength(2);
    const relIds = createdForC.map((c) => c.relationshipId).sort();
    expect(relIds).toEqual([rBC.id, rAC.id].sort());

    const allConnections = diagram.objects.flatMap((o) => o.sourceConnections ?? []);
    expect(allConnections).toHaveLength(3);
  });

  it('does not duplicate connections when run twice for the same new object', () => {
    const model = createEmptyModel();
    const a = createElement('ApplicationComponent', 'A');
    const b = createElement('ApplicationComponent', 'B');
    addElementToModel(model, a);
    addElementToModel(model, b);
    const rel = createRelationship('Serving', a.id, b.id);
    model.relationships.push(rel);

    const diagram = createDiagram('V');
    model.diagrams.push(diagram);
    const aObj = addObjectToDiagram(diagram, createDiagramObject(a.id, 0, 0));
    const bObj = addObjectToDiagram(diagram, createDiagramObject(b.id, 200, 0));

    const first = autoConnectDiagramObject(model, diagram, aObj);
    const second = autoConnectDiagramObject(model, diagram, aObj);

    expect(first).toHaveLength(1);
    expect(second).toEqual([]);
    expect(aObj.sourceConnections).toHaveLength(1);
    expect(bObj.targetConnectionIds).toHaveLength(1);
  });

  it('skips relationships already represented by a manually-added connection in the view', () => {
    const model = createEmptyModel();
    const a = createElement('ApplicationComponent', 'A');
    const b = createElement('ApplicationComponent', 'B');
    addElementToModel(model, a);
    addElementToModel(model, b);
    const rel = createRelationship('Serving', a.id, b.id);
    model.relationships.push(rel);

    const diagram = createDiagram('V');
    model.diagrams.push(diagram);
    const aObj = addObjectToDiagram(diagram, createDiagramObject(a.id, 0, 0));
    const bObj = addObjectToDiagram(diagram, createDiagramObject(b.id, 200, 0));

    const manual = createDiagramConnection(aObj.id, bObj.id, rel.id);
    aObj.sourceConnections = [manual];
    bObj.targetConnectionIds = [manual.id];

    const created = autoConnectDiagramObject(model, diagram, aObj);

    expect(created).toEqual([]);
    expect(aObj.sourceConnections).toHaveLength(1);
    expect(bObj.targetConnectionIds).toEqual([manual.id]);
  });

  it('returns an empty list when the new object has relationships but no on-canvas peer', () => {
    const model = createEmptyModel();
    const a = createElement('ApplicationComponent', 'A');
    const b = createElement('ApplicationComponent', 'B');
    addElementToModel(model, a);
    addElementToModel(model, b);
    model.relationships.push(createRelationship('Serving', a.id, b.id));

    const diagram = createDiagram('V');
    model.diagrams.push(diagram);
    const aObj = addObjectToDiagram(diagram, createDiagramObject(a.id, 0, 0));

    const created = autoConnectDiagramObject(model, diagram, aObj);

    expect(created).toEqual([]);
    expect(aObj.sourceConnections ?? []).toEqual([]);
  });
});
