import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateMermaid,
  generateMermaidFromView,
  type MermaidOptions,
} from './mermaid-exporter.js';
import {
  createTestModel,
  createTestModelWithView,
  createMinimalModel,
  resetIdCounter,
} from '../__tests__/fixtures/sample-model.js';

describe('mermaid-exporter', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe('generateMermaid', () => {
    it('should generate valid flowchart syntax', () => {
      const model = createTestModel();
      const result = generateMermaid(model, { diagramType: 'flowchart' });

      expect(result).toContain('flowchart TB');
      expect(result).toContain('subgraph');
    });

    it('should use graph LR when specified', () => {
      const model = createTestModel();
      const result = generateMermaid(model, {
        diagramType: 'flowchart',
        direction: 'LR',
      });

      expect(result).toContain('flowchart LR');
    });

    it('should group elements by layer in subgraphs', () => {
      const model = createTestModel();
      const result = generateMermaid(model, { diagramType: 'flowchart' });

      expect(result).toContain('subgraph Business');
      expect(result).toContain('subgraph Application');
      expect(result).toContain('subgraph Technology');
    });

    it('should include element names in node labels', () => {
      const model = createTestModel();
      const result = generateMermaid(model, { diagramType: 'flowchart' });

      expect(result).toContain('Customer');
      expect(result).toContain('Order Process');
      expect(result).toContain('Order Application');
    });

    it('should include relationship labels when enabled', () => {
      const model = createTestModel();
      const result = generateMermaid(model, {
        diagramType: 'flowchart',
        includeRelationshipLabels: true,
      });

      // Check for relationship type labels
      expect(result).toMatch(/-->|Assignment|Serving|Realization/);
    });

    it('should not include relationship labels when disabled', () => {
      const model = createTestModel();
      const result = generateMermaid(model, {
        diagramType: 'flowchart',
        includeRelationshipLabels: false,
      });

      // Should have plain arrows without labels
      expect(result).toContain('-->');
      // Should not have relationship type in the arrow syntax
      expect(result).not.toMatch(/-->\|Assignment\|/);
    });

    it('should filter by layer when layerFilter is specified', () => {
      const model = createTestModel();
      const result = generateMermaid(model, {
        diagramType: 'flowchart',
        layerFilter: ['Business'],
      });

      expect(result).toContain('subgraph Business');
      expect(result).not.toContain('subgraph Application');
      expect(result).not.toContain('subgraph Technology');
    });

    it('should filter multiple layers', () => {
      const model = createTestModel();
      const result = generateMermaid(model, {
        diagramType: 'flowchart',
        layerFilter: ['Business', 'Application'],
      });

      expect(result).toContain('subgraph Business');
      expect(result).toContain('subgraph Application');
      expect(result).not.toContain('subgraph Technology');
    });

    it('should handle empty model gracefully', () => {
      const model = createTestModel();
      model.folders.forEach((f) => (f.elements = []));
      model.relationships = [];

      const result = generateMermaid(model, { diagramType: 'flowchart' });

      expect(result).toContain('flowchart TB');
      // Should not throw
    });

    it('should escape special characters in names', () => {
      const model = createMinimalModel();
      // Find an element and give it a problematic name
      const folder = model.folders.find((f) => f.type === 'business');
      if (folder && folder.elements.length > 0) {
        folder.elements[0].name = 'Process "with" quotes & <special>';
      }

      const result = generateMermaid(model, { diagramType: 'flowchart' });

      // Should not contain unescaped special chars in labels
      expect(result).not.toContain('"with"');
      expect(result).toContain('with');
    });

    it('should use different directions', () => {
      const model = createMinimalModel();

      const tbResult = generateMermaid(model, { direction: 'TB' });
      expect(tbResult).toContain('flowchart TB');

      const lrResult = generateMermaid(model, { direction: 'LR' });
      expect(lrResult).toContain('flowchart LR');

      const btResult = generateMermaid(model, { direction: 'BT' });
      expect(btResult).toContain('flowchart BT');

      const rlResult = generateMermaid(model, { direction: 'RL' });
      expect(rlResult).toContain('flowchart RL');
    });
  });

  describe('generateMermaidFromView', () => {
    it('should generate diagram from specific view', () => {
      const model = createTestModelWithView();
      const viewId = model.diagrams[0].id;

      const result = generateMermaidFromView(model, viewId);

      expect(result).toContain('flowchart TB');
      // Should only include elements that are in the view
      expect(result).toContain('Customer');
    });

    it('should throw error for non-existent view', () => {
      const model = createTestModelWithView();

      expect(() => generateMermaidFromView(model, 'non-existent-view')).toThrow();
    });

    it('should include connections from the view', () => {
      const model = createTestModelWithView();
      const viewId = model.diagrams[0].id;

      const result = generateMermaidFromView(model, viewId);

      // Should have connections
      expect(result).toContain('-->');
    });
  });

  describe('default options', () => {
    it('should use sensible defaults', () => {
      const model = createTestModel();
      const result = generateMermaid(model);

      // Default should be flowchart TB
      expect(result).toContain('flowchart TB');
      // Default should not include labels
      expect(result).not.toMatch(/-->\|.*\|/);
    });
  });
});
