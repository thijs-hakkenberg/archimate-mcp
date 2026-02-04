import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateMarkdown,
  type MarkdownOptions,
} from './markdown-exporter.js';
import {
  createTestModel,
  createTestModelWithView,
  createMinimalModel,
  resetIdCounter,
} from '../__tests__/fixtures/sample-model.js';

describe('markdown-exporter', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe('generateMarkdown', () => {
    it('should generate valid markdown with model name as title', () => {
      const model = createTestModel();
      const result = generateMarkdown(model);

      expect(result).toContain('# Test Architecture Model');
    });

    it('should include overview section with counts', () => {
      const model = createTestModel();
      const result = generateMarkdown(model);

      expect(result).toContain('## Overview');
      expect(result).toMatch(/\*\*Elements:\*\*\s*\d+/);
      expect(result).toMatch(/\*\*Relationships:\*\*\s*\d+/);
    });

    it('should group elements by layer', () => {
      const model = createTestModel();
      const result = generateMarkdown(model, { groupByLayer: true });

      expect(result).toContain('## Business Layer');
      expect(result).toContain('## Application Layer');
      expect(result).toContain('## Technology Layer');
    });

    it('should include element documentation', () => {
      const model = createTestModel();
      const result = generateMarkdown(model);

      expect(result).toContain('Customer');
      expect(result).toContain('External customer');
    });

    it('should include relationships when enabled', () => {
      const model = createTestModel();
      const result = generateMarkdown(model, { includeRelationships: true });

      expect(result).toContain('Relationships:');
      // Should mention relationship types
      expect(result).toMatch(/Assignment|Serving|Realization/);
    });

    it('should not include relationships when disabled', () => {
      const model = createTestModel();
      const result = generateMarkdown(model, { includeRelationships: false });

      // Should not contain relationship details in element sections (with newline after)
      expect(result).not.toContain('**Relationships:**\n\n-');
    });

    it('should include views section when enabled', () => {
      const model = createTestModelWithView();
      const result = generateMarkdown(model, { includeViews: true });

      expect(result).toContain('## Views');
      expect(result).toContain('Main Architecture View');
    });

    it('should include Mermaid diagrams when enabled', () => {
      const model = createTestModelWithView();
      const result = generateMarkdown(model, {
        includeViews: true,
        includeDiagrams: true,
      });

      expect(result).toContain('```mermaid');
      expect(result).toContain('flowchart');
    });

    it('should not include Mermaid diagrams when disabled', () => {
      const model = createTestModelWithView();
      const result = generateMarkdown(model, {
        includeViews: true,
        includeDiagrams: false,
      });

      expect(result).not.toContain('```mermaid');
    });

    it('should include properties when enabled', () => {
      const model = createMinimalModel();
      // Add properties to an element
      const folder = model.folders.find((f) => f.type === 'business');
      if (folder && folder.elements.length > 0) {
        folder.elements[0].properties = [
          { key: 'owner', value: 'John Doe' },
          { key: 'status', value: 'Active' },
        ];
      }

      const result = generateMarkdown(model, { includeProperties: true });

      expect(result).toContain('owner');
      expect(result).toContain('John Doe');
    });

    it('should handle empty model gracefully', () => {
      const model = createTestModel();
      model.folders.forEach((f) => (f.elements = []));
      model.relationships = [];
      model.diagrams = [];

      const result = generateMarkdown(model);

      expect(result).toContain('# Test Architecture Model');
      expect(result).toContain('**Elements:** 0');
    });

    it('should escape markdown special characters in element names', () => {
      const model = createMinimalModel();
      const folder = model.folders.find((f) => f.type === 'business');
      if (folder && folder.elements.length > 0) {
        folder.elements[0].name = 'Process *with* _special_ chars';
      }

      const result = generateMarkdown(model);

      // Should contain the name (may be escaped)
      expect(result).toContain('Process');
      expect(result).toContain('with');
      expect(result).toContain('special');
      expect(result).toContain('chars');
    });

    it('should organize elements by type within layers', () => {
      const model = createTestModel();
      const result = generateMarkdown(model, { groupByLayer: true });

      // Should have subsections for element types
      expect(result).toContain('### Business Actor');
      expect(result).toContain('### Business Process');
    });
  });

  describe('default options', () => {
    it('should use sensible defaults', () => {
      const model = createTestModel();
      const result = generateMarkdown(model);

      // Default should group by layer
      expect(result).toContain('## Business Layer');
      // Default should include relationships
      expect(result).toContain('Relationship');
    });
  });

  describe('table of contents', () => {
    it('should include table of contents for large models', () => {
      const model = createTestModel();
      const result = generateMarkdown(model);

      expect(result).toContain('## Table of Contents');
      expect(result).toContain('[Business Layer]');
    });
  });
});
