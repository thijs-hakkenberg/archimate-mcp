import { describe, it, expect, beforeEach } from 'vitest';
import { writeExchangeFormat, saveExchangeFile } from './exchange-writer.js';
import { parseExchangeFormat } from './exchange-reader.js';
import {
  createTestModel,
  createTestModelWithView,
  createMinimalModel,
  resetIdCounter,
  getAllElements,
} from '../__tests__/fixtures/sample-model.js';

describe('exchange-writer', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe('writeExchangeFormat', () => {
    it('should produce valid XML', () => {
      const model = createTestModel();
      const xml = writeExchangeFormat(model);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<model');
      expect(xml).toContain('</model>');
    });

    it('should include ArchiMate 3.0 namespace', () => {
      const model = createTestModel();
      const xml = writeExchangeFormat(model);

      expect(xml).toContain('xmlns="http://www.opengroup.org/xsd/archimate/3.0/"');
    });

    it('should include model identifier', () => {
      const model = createTestModel();
      const xml = writeExchangeFormat(model);

      expect(xml).toContain(`identifier="${model.id}"`);
    });

    it('should include model name', () => {
      const model = createTestModel();
      const xml = writeExchangeFormat(model);

      expect(xml).toContain('<name');
      expect(xml).toContain(model.name);
    });

    it('should include elements in elements container', () => {
      const model = createTestModel();
      const xml = writeExchangeFormat(model);

      expect(xml).toContain('<elements>');
      expect(xml).toContain('</elements>');
      expect(xml).toContain('<element');
    });

    it('should include element types as xsi:type', () => {
      const model = createTestModel();
      const xml = writeExchangeFormat(model);

      expect(xml).toContain('xsi:type="BusinessActor"');
      expect(xml).toContain('xsi:type="ApplicationComponent"');
    });

    it('should include relationships in relationships container', () => {
      const model = createTestModel();
      const xml = writeExchangeFormat(model);

      expect(xml).toContain('<relationships>');
      expect(xml).toContain('</relationships>');
      expect(xml).toContain('<relationship');
    });

    it('should include relationship source and target', () => {
      const model = createTestModel();
      const xml = writeExchangeFormat(model);

      expect(xml).toMatch(/source="[^"]+"/);
      expect(xml).toMatch(/target="[^"]+"/);
    });

    it('should include views in views/diagrams container', () => {
      const model = createTestModelWithView();
      const xml = writeExchangeFormat(model);

      expect(xml).toContain('<views>');
      expect(xml).toContain('<diagrams>');
      expect(xml).toContain('<view');
    });

    it('should include diagram nodes with position', () => {
      const model = createTestModelWithView();
      const xml = writeExchangeFormat(model);

      expect(xml).toContain('<node');
      expect(xml).toMatch(/x="\d+"/);
      expect(xml).toMatch(/y="\d+"/);
      expect(xml).toMatch(/w="\d+"/);
      expect(xml).toMatch(/h="\d+"/);
    });

    it('should include connections in views', () => {
      const model = createTestModelWithView();
      const xml = writeExchangeFormat(model);

      expect(xml).toContain('<connection');
      expect(xml).toMatch(/relationshipRef="[^"]+"/);
    });

    it('should handle empty model', () => {
      const model = createTestModel();
      model.folders.forEach((f) => (f.elements = []));
      model.relationships = [];
      model.diagrams = [];

      const xml = writeExchangeFormat(model);

      expect(xml).toContain('<model');
      expect(xml).toContain('</model>');
    });
  });

  describe('round-trip', () => {
    it('should round-trip without data loss for elements', () => {
      const original = createTestModel();
      const xml = writeExchangeFormat(original);
      const parsed = parseExchangeFormat(xml);

      const originalElements = getAllElements(original);
      const parsedElements = getAllElementsFromParsed(parsed);

      expect(parsedElements.length).toBe(originalElements.length);

      // Check each original element exists in parsed
      for (const origElem of originalElements) {
        const found = parsedElements.find((e) => e.id === origElem.id);
        expect(found).toBeDefined();
        expect(found!.type).toBe(origElem.type);
        expect(found!.name).toBe(origElem.name);
      }
    });

    it('should round-trip without data loss for relationships', () => {
      const original = createTestModel();
      const xml = writeExchangeFormat(original);
      const parsed = parseExchangeFormat(xml);

      expect(parsed.relationships.length).toBe(original.relationships.length);

      for (const origRel of original.relationships) {
        const found = parsed.relationships.find((r) => r.id === origRel.id);
        expect(found).toBeDefined();
        expect(found!.type).toBe(origRel.type);
        expect(found!.sourceId).toBe(origRel.sourceId);
        expect(found!.targetId).toBe(origRel.targetId);
      }
    });

    it('should round-trip model metadata', () => {
      const original = createTestModel();
      original.documentation = 'Test documentation for round-trip';

      const xml = writeExchangeFormat(original);
      const parsed = parseExchangeFormat(xml);

      expect(parsed.name).toBe(original.name);
      expect(parsed.documentation).toBe(original.documentation);
    });

    it('should round-trip views', () => {
      const original = createTestModelWithView();
      const xml = writeExchangeFormat(original);
      const parsed = parseExchangeFormat(xml);

      expect(parsed.diagrams.length).toBe(original.diagrams.length);
      expect(parsed.diagrams[0].name).toBe(original.diagrams[0].name);
    });
  });
});

// Helper function
function getAllElementsFromParsed(model: ReturnType<typeof parseExchangeFormat>) {
  const elements: Array<{ id: string; type: string; name: string }> = [];

  function collectFromFolder(folder: { elements: typeof elements; subfolders: typeof model.folders }) {
    elements.push(...folder.elements);
    folder.subfolders.forEach(collectFromFolder);
  }

  model.folders.forEach(collectFromFolder);
  return elements;
}
