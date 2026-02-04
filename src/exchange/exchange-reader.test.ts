import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseExchangeFormat, readExchangeFile } from './exchange-reader.js';

describe('exchange-reader', () => {
  describe('parseExchangeFormat', () => {
    it('should parse standard ArchiMate exchange XML', () => {
      const xml = fs.readFileSync(
        path.join(process.cwd(), 'src/__tests__/fixtures/sample-exchange.xml'),
        'utf-8'
      );

      const model = parseExchangeFormat(xml);

      expect(model.name).toBe('Sample Exchange Model');
      expect(model.documentation).toContain('sample model');
    });

    it('should parse elements from exchange format', () => {
      const xml = fs.readFileSync(
        path.join(process.cwd(), 'src/__tests__/fixtures/sample-exchange.xml'),
        'utf-8'
      );

      const model = parseExchangeFormat(xml);

      // Check elements are parsed correctly
      const allElements = getAllElementsFromModel(model);
      expect(allElements.length).toBeGreaterThan(0);

      // Check specific elements
      const customer = allElements.find((e) => e.name === 'Customer');
      expect(customer).toBeDefined();
      expect(customer!.type).toBe('BusinessActor');
    });

    it('should map exchange element types to internal types', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <model xmlns="http://www.opengroup.org/xsd/archimate/3.0/"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               identifier="id-test">
          <name xml:lang="en">Test</name>
          <elements>
            <element identifier="id-1" xsi:type="BusinessActor">
              <name xml:lang="en">Actor</name>
            </element>
            <element identifier="id-2" xsi:type="ApplicationComponent">
              <name xml:lang="en">Component</name>
            </element>
            <element identifier="id-3" xsi:type="Node">
              <name xml:lang="en">Server</name>
            </element>
          </elements>
        </model>`;

      const model = parseExchangeFormat(xml);
      const elements = getAllElementsFromModel(model);

      expect(elements.find((e) => e.type === 'BusinessActor')).toBeDefined();
      expect(elements.find((e) => e.type === 'ApplicationComponent')).toBeDefined();
      expect(elements.find((e) => e.type === 'Node')).toBeDefined();
    });

    it('should parse relationships from exchange format', () => {
      const xml = fs.readFileSync(
        path.join(process.cwd(), 'src/__tests__/fixtures/sample-exchange.xml'),
        'utf-8'
      );

      const model = parseExchangeFormat(xml);

      expect(model.relationships.length).toBeGreaterThan(0);

      // Check specific relationship
      const assignment = model.relationships.find((r) => r.type === 'Assignment');
      expect(assignment).toBeDefined();
    });

    it('should parse relationship types correctly', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <model xmlns="http://www.opengroup.org/xsd/archimate/3.0/"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               identifier="id-test">
          <name xml:lang="en">Test</name>
          <elements>
            <element identifier="id-1" xsi:type="BusinessActor"><name>A</name></element>
            <element identifier="id-2" xsi:type="BusinessProcess"><name>B</name></element>
          </elements>
          <relationships>
            <relationship identifier="id-rel-1" xsi:type="Assignment" source="id-1" target="id-2"/>
            <relationship identifier="id-rel-2" xsi:type="Serving" source="id-2" target="id-1"/>
            <relationship identifier="id-rel-3" xsi:type="Realization" source="id-1" target="id-2"/>
          </relationships>
        </model>`;

      const model = parseExchangeFormat(xml);

      expect(model.relationships).toHaveLength(3);
      expect(model.relationships.find((r) => r.type === 'Assignment')).toBeDefined();
      expect(model.relationships.find((r) => r.type === 'Serving')).toBeDefined();
      expect(model.relationships.find((r) => r.type === 'Realization')).toBeDefined();
    });

    it('should parse views from exchange format', () => {
      const xml = fs.readFileSync(
        path.join(process.cwd(), 'src/__tests__/fixtures/sample-exchange.xml'),
        'utf-8'
      );

      const model = parseExchangeFormat(xml);

      expect(model.diagrams.length).toBeGreaterThan(0);
      expect(model.diagrams[0].name).toBe('Main Overview');
    });

    it('should parse diagram objects with bounds', () => {
      const xml = fs.readFileSync(
        path.join(process.cwd(), 'src/__tests__/fixtures/sample-exchange.xml'),
        'utf-8'
      );

      const model = parseExchangeFormat(xml);
      const diagram = model.diagrams[0];

      expect(diagram.objects.length).toBeGreaterThan(0);
      const obj = diagram.objects[0];
      expect(obj.bounds).toBeDefined();
      expect(obj.bounds.x).toBeGreaterThanOrEqual(0);
      expect(obj.bounds.y).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty elements list', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <model xmlns="http://www.opengroup.org/xsd/archimate/3.0/"
               identifier="id-test">
          <name xml:lang="en">Empty Model</name>
          <elements/>
        </model>`;

      const model = parseExchangeFormat(xml);
      expect(model.name).toBe('Empty Model');
      expect(getAllElementsFromModel(model)).toHaveLength(0);
    });

    it('should preserve element documentation', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <model xmlns="http://www.opengroup.org/xsd/archimate/3.0/"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               identifier="id-test">
          <name xml:lang="en">Test</name>
          <elements>
            <element identifier="id-1" xsi:type="BusinessActor">
              <name xml:lang="en">Actor</name>
              <documentation xml:lang="en">This is the documentation</documentation>
            </element>
          </elements>
        </model>`;

      const model = parseExchangeFormat(xml);
      const elements = getAllElementsFromModel(model);
      expect(elements[0].documentation).toBe('This is the documentation');
    });
  });

  describe('readExchangeFile', () => {
    it('should read and parse exchange file from disk', async () => {
      const filePath = path.join(
        process.cwd(),
        'src/__tests__/fixtures/sample-exchange.xml'
      );

      const model = await readExchangeFile(filePath);

      expect(model.name).toBe('Sample Exchange Model');
    });

    it('should throw error for non-existent file', async () => {
      await expect(readExchangeFile('/non/existent/file.xml')).rejects.toThrow();
    });
  });
});

// Helper function to get all elements from model
function getAllElementsFromModel(model: ReturnType<typeof parseExchangeFormat>) {
  const elements: Array<{ id: string; type: string; name: string; documentation?: string }> = [];

  function collectFromFolder(folder: { elements: typeof elements; subfolders: typeof model.folders }) {
    elements.push(...folder.elements);
    folder.subfolders.forEach(collectFromFolder);
  }

  model.folders.forEach(collectFromFolder);
  return elements;
}
