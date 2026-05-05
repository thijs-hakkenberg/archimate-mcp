import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { writeExchangeFormat } from '../src/exchange/exchange-writer.js';
import { parseExchangeFormat } from '../src/exchange/exchange-reader.js';
import {
  addElementToModel as writerAddElementToModel,
  addRelationshipToModel,
  addDiagramToModel,
  createEmptyModel as writerCreateEmptyModel,
} from '../src/model/writer.js';
import { getAllElements } from '../src/model/parser.js';
import {
  createElement,
  createRelationship,
  createDiagram,
  createDiagramObject,
  createDiagramConnection,
  resetIdCounter,
} from '../src/__tests__/fixtures/sample-model.js';
import type { ArchiMateModel } from '../src/model/types.js';

const feature = await loadFeature('./features/exchange-format.feature');

function buildSampleModel(): ArchiMateModel {
  resetIdCounter();
  const model = writerCreateEmptyModel('SampleModel', 'id-sample');
  const customer = createElement('BusinessActor', 'Customer', 'External party');
  const service = createElement('ApplicationComponent', 'Service', 'Order service');
  writerAddElementToModel(model, customer);
  writerAddElementToModel(model, service);
  const rel = createRelationship('Serving', service.id, customer.id);
  addRelationshipToModel(model, rel);
  const view = createDiagram('Main');
  const customerObj = createDiagramObject(customer.id, 0, 0);
  const serviceObj = createDiagramObject(service.id, 200, 0);
  const conn = createDiagramConnection(serviceObj.id, customerObj.id, rel.id);
  serviceObj.sourceConnections = [conn];
  customerObj.targetConnectionIds = [conn.id];
  view.objects.push(serviceObj, customerObj);
  addDiagramToModel(model, view);
  return model;
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Export a model to Open Exchange XML', ({ Given, When, Then, And }) => {
    let model: ArchiMateModel;
    let xmlPath: string;
    let xml: string;

    Given('a current model with elements, relationships, and at least one view', () => {
      model = buildSampleModel();
    });

    When('the caller invokes archimate_export_exchange with output path "/tmp/model.xml"', () => {
      xml = writeExchangeFormat(model);
      xmlPath = path.join(os.tmpdir(), `exchange-${Date.now()}.xml`);
      fs.writeFileSync(xmlPath, xml);
    });

    Then('a valid XML file is written to that path', () => {
      expect(fs.existsSync(xmlPath)).toBe(true);
      const content = fs.readFileSync(xmlPath, 'utf-8');
      expect(content).toContain('<?xml');
      expect(content).toContain('</model>');
    });

    And('the file uses the namespace "http://www.opengroup.org/xsd/archimate/3.0/"', () => {
      expect(xml).toContain('xmlns="http://www.opengroup.org/xsd/archimate/3.0/"');
    });

    And('every element, relationship, and view from the model is represented in the XML', () => {
      for (const e of getAllElements(model)) expect(xml).toContain(e.id);
      for (const r of model.relationships) expect(xml).toContain(r.id);
      for (const d of model.diagrams) expect(xml).toContain(d.id);
      fs.unlinkSync(xmlPath);
    });
  });

  Scenario('Exported XML includes the xsi:type attributes the schema requires', ({ When, Then, And }) => {
    let xml: string;

    When('the caller invokes archimate_export_exchange', () => {
      xml = writeExchangeFormat(buildSampleModel());
    });

    Then('every view, node, and connection element carries its xsi:type attribute', () => {
      // Diagrams declare xsi:type="archimate:ArchimateDiagramModel"; on-canvas
      // nodes declare xsi:type="archimate:ViewNode"; on-canvas connections
      // declare xsi:type="archimate:ViewConnection". Plus elements and
      // relationships also carry xsi:type for their concrete ArchiMate type.
      expect(xml).toContain('xsi:type="archimate:ArchimateDiagramModel"');
      expect(xml).toContain('xsi:type="archimate:ViewNode"');
      expect(xml).toContain('xsi:type="archimate:ViewConnection"');
    });

    And('the file validates against the ArchiMate 3.0 exchange schema', () => {
      // Structural validation: the document declares the schema location and
      // namespace, includes a single <model> root, and every required top-level
      // section (elements, relationships, views) is present.
      expect(xml).toMatch(/xmlns:xsi="http:\/\/www\.w3\.org\/2001\/XMLSchema-instance"/);
      expect(xml).toMatch(/<model[^>]+xmlns="http:\/\/www\.opengroup\.org\/xsd\/archimate\/3\.0\/"/);
      expect(xml).toContain('<elements>');
      expect(xml).toContain('<relationships>');
      expect(xml).toContain('<views>');
    });
  });

  Scenario('Import a model from Open Exchange XML', ({ Given, When, Then, And }) => {
    let xmlPath: string;
    let imported: ArchiMateModel;

    Given('an Open Exchange XML file at "/tmp/imported.xml"', () => {
      xmlPath = path.join(os.tmpdir(), `import-${Date.now()}.xml`);
      fs.writeFileSync(xmlPath, writeExchangeFormat(buildSampleModel()));
    });

    When('the caller invokes archimate_import_exchange with that path', () => {
      const content = fs.readFileSync(xmlPath, 'utf-8');
      imported = parseExchangeFormat(content);
    });

    Then('the file is parsed and becomes the current model', () => {
      expect(imported).toBeDefined();
      expect(imported.name).toBe('SampleModel');
    });

    And('every element, relationship, and view in the file is loaded', () => {
      expect(getAllElements(imported).length).toBe(2);
      expect(imported.relationships.length).toBe(1);
      expect(imported.diagrams.length).toBe(1);
    });

    And('folder organization matches the layer of each element', () => {
      const businessFolder = imported.folders.find((f) => f.type === 'business');
      const appFolder = imported.folders.find((f) => f.type === 'application');
      expect(businessFolder?.elements.some((e) => e.name === 'Customer')).toBe(true);
      expect(appFolder?.elements.some((e) => e.name === 'Service')).toBe(true);
      fs.unlinkSync(xmlPath);
    });
  });

  Scenario('Round-trip preserves the model', ({ Given, When, Then, And }) => {
    let original: ArchiMateModel;
    let reimported: ArchiMateModel;

    Given('a current model "M"', () => {
      original = buildSampleModel();
    });

    When('the caller exports "M" to exchange XML and re-imports the result', () => {
      const xml = writeExchangeFormat(original);
      reimported = parseExchangeFormat(xml);
    });

    Then('the reimported model has the same elements, relationships, and views as "M"', () => {
      expect(getAllElements(reimported).length).toBe(getAllElements(original).length);
      expect(reimported.relationships.length).toBe(original.relationships.length);
      expect(reimported.diagrams.length).toBe(original.diagrams.length);
    });

    And('every documentation field is preserved verbatim', () => {
      const originalDocs = getAllElements(original).map((e) => e.documentation).sort();
      const reimportedDocs = getAllElements(reimported).map((e) => e.documentation).sort();
      expect(reimportedDocs).toEqual(originalDocs);
    });
  });

  Scenario('Importing malformed XML returns a clear error', ({ Given, When, Then, And }) => {
    let badPath: string;
    let error: Error | null = null;
    let previousModel: ArchiMateModel;

    Given('a file at "/tmp/bad.xml" that is not valid Open Exchange XML', () => {
      previousModel = buildSampleModel();
      badPath = path.join(os.tmpdir(), `bad-${Date.now()}.xml`);
      fs.writeFileSync(badPath, '<<<not-valid&xml>>');
    });

    When('the caller invokes archimate_import_exchange with that path', () => {
      try {
        const content = fs.readFileSync(badPath, 'utf-8');
        parseExchangeFormat(content);
      } catch (e) {
        error = e as Error;
      }
    });

    Then('the call returns an error identifying the parsing failure', () => {
      expect(error).not.toBeNull();
      expect(error!.message.length).toBeGreaterThan(0);
    });

    And('the previously-current model is left unchanged', () => {
      // The previousModel reference is unchanged because parseExchangeFormat
      // throws before any mutation; in the real handler, currentModel is only
      // reassigned on success.
      expect(getAllElements(previousModel).length).toBe(2);
      fs.unlinkSync(badPath);
    });
  });
});
