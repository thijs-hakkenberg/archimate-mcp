import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEmptyModel,
  createTestModel,
  createTestModelWithView,
  createMinimalModel,
  getAllElements,
  getElementById,
  getRelationshipsForElement,
  resetIdCounter,
} from './sample-model.js';

describe('sample-model fixtures', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe('createEmptyModel', () => {
    it('should create a model with standard folders', () => {
      const model = createEmptyModel();
      expect(model.name).toBe('Test Model');
      expect(model.folders).toHaveLength(9);
      expect(model.relationships).toHaveLength(0);
      expect(model.diagrams).toHaveLength(0);
    });

    it('should accept a custom name', () => {
      const model = createEmptyModel('My Custom Model');
      expect(model.name).toBe('My Custom Model');
    });
  });

  describe('createTestModel', () => {
    it('should create a model with elements from multiple layers', () => {
      const model = createTestModel();
      const elements = getAllElements(model);

      // Should have business, application, and technology elements
      expect(elements.length).toBeGreaterThan(0);
      expect(elements.some((e) => e.type === 'BusinessActor')).toBe(true);
      expect(elements.some((e) => e.type === 'ApplicationComponent')).toBe(true);
      expect(elements.some((e) => e.type === 'Node')).toBe(true);
    });

    it('should create relationships between elements', () => {
      const model = createTestModel();
      expect(model.relationships.length).toBeGreaterThan(0);
    });
  });

  describe('createTestModelWithView', () => {
    it('should create a model with a diagram', () => {
      const model = createTestModelWithView();
      expect(model.diagrams).toHaveLength(1);
      expect(model.diagrams[0].name).toBe('Main Architecture View');
    });

    it('should have diagram objects with bounds', () => {
      const model = createTestModelWithView();
      const diagram = model.diagrams[0];
      expect(diagram.objects.length).toBeGreaterThan(0);
      diagram.objects.forEach((obj) => {
        expect(obj.bounds).toBeDefined();
        expect(obj.bounds.x).toBeGreaterThanOrEqual(0);
        expect(obj.bounds.y).toBeGreaterThanOrEqual(0);
        expect(obj.bounds.width).toBeGreaterThan(0);
        expect(obj.bounds.height).toBeGreaterThan(0);
      });
    });

    it('should have connections in diagram objects', () => {
      const model = createTestModelWithView();
      const diagram = model.diagrams[0];
      const connectionsCount = diagram.objects.reduce(
        (sum, obj) => sum + (obj.sourceConnections?.length || 0),
        0
      );
      expect(connectionsCount).toBeGreaterThan(0);
    });
  });

  describe('createMinimalModel', () => {
    it('should create a simple model with few elements', () => {
      const model = createMinimalModel();
      const elements = getAllElements(model);
      expect(elements).toHaveLength(3);
      expect(model.relationships).toHaveLength(2);
    });
  });

  describe('getAllElements', () => {
    it('should return all elements from all folders', () => {
      const model = createTestModel();
      const elements = getAllElements(model);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('getElementById', () => {
    it('should find element by id', () => {
      const model = createTestModel();
      const elements = getAllElements(model);
      const firstElement = elements[0];
      const found = getElementById(model, firstElement.id);
      expect(found).toBe(firstElement);
    });

    it('should return undefined for non-existent id', () => {
      const model = createTestModel();
      const found = getElementById(model, 'non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('getRelationshipsForElement', () => {
    it('should find outgoing relationships', () => {
      const model = createTestModel();
      const elements = getAllElements(model);
      const customer = elements.find((e) => e.name === 'Customer')!;
      const outgoing = getRelationshipsForElement(model, customer.id, 'outgoing');
      expect(outgoing.length).toBeGreaterThan(0);
      outgoing.forEach((r) => expect(r.sourceId).toBe(customer.id));
    });

    it('should find incoming relationships', () => {
      const model = createTestModel();
      const elements = getAllElements(model);
      const orderProcess = elements.find((e) => e.name === 'Order Process')!;
      const incoming = getRelationshipsForElement(model, orderProcess.id, 'incoming');
      expect(incoming.length).toBeGreaterThan(0);
      incoming.forEach((r) => expect(r.targetId).toBe(orderProcess.id));
    });

    it('should find both directions by default', () => {
      const model = createTestModel();
      const elements = getAllElements(model);
      const orderProcess = elements.find((e) => e.name === 'Order Process')!;
      const both = getRelationshipsForElement(model, orderProcess.id);
      expect(both.length).toBeGreaterThan(0);
    });
  });
});
