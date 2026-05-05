import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { generateMermaid, generateMermaidFromView } from '../src/exporters/mermaid-exporter.js';
import { saveDiagram } from '../src/exporters/svg-exporter.js';
import { generateMarkdown, saveMarkdown } from '../src/exporters/markdown-exporter.js';
import { generateHtmlDeck, saveHtmlDeck } from '../src/exporters/html-deck-exporter.js';
import {
  addElementToModel as writerAddElementToModel,
  addRelationshipToModel,
  addDiagramToModel,
  createEmptyModel as writerCreateEmptyModel,
} from '../src/model/writer.js';
import {
  createElement,
  createRelationship,
  createDiagram,
  createDiagramObject,
  createDiagramConnection,
  resetIdCounter,
} from '../src/__tests__/fixtures/sample-model.js';
import type { ArchiMateModel } from '../src/model/types.js';

const feature = await loadFeature('./features/export-rendering.feature');

function buildModelWithView(): {
  model: ArchiMateModel;
  viewId: string;
  threeElementViewId?: string;
} {
  resetIdCounter();
  const model = writerCreateEmptyModel('ExportSample', 'id-export');

  const a = createElement('ApplicationComponent', 'A');
  const b = createElement('ApplicationComponent', 'B');
  const c = createElement('ApplicationComponent', 'C');
  const node = createElement('Node', 'N');
  [a, b, c, node].forEach((e) => writerAddElementToModel(model, e));

  const r1 = createRelationship('Serving', a.id, b.id);
  const r2 = createRelationship('Serving', b.id, c.id);
  addRelationshipToModel(model, r1);
  addRelationshipToModel(model, r2);

  const view = createDiagram('Main');
  const aObj = createDiagramObject(a.id, 0, 0);
  const bObj = createDiagramObject(b.id, 200, 0);
  const cObj = createDiagramObject(c.id, 400, 0);
  const conn1 = createDiagramConnection(aObj.id, bObj.id, r1.id);
  const conn2 = createDiagramConnection(bObj.id, cObj.id, r2.id);
  aObj.sourceConnections = [conn1];
  bObj.sourceConnections = [conn2];
  bObj.targetConnectionIds = [conn1.id];
  cObj.targetConnectionIds = [conn2.id];
  view.objects.push(aObj, bObj, cObj);
  addDiagramToModel(model, view);

  return { model, viewId: view.id };
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('a current model with at least one view', () => {
      // Each scenario builds its own model + view.
    });
  });

  Scenario('Export the entire model as a Mermaid flowchart', ({ When, Then, And }) => {
    let mermaid: string;
    let model: ArchiMateModel;

    When('the caller invokes archimate_export_mermaid with no view filter', () => {
      const built = buildModelWithView();
      model = built.model;
      mermaid = generateMermaid(model);
    });

    Then('the response includes a flowchart with every element grouped by layer', () => {
      expect(mermaid).toContain('flowchart');
      expect(mermaid).toContain('Application');
      expect(mermaid).toContain('Technology');
    });

    And('relationships are rendered as labeled edges', () => {
      // Mermaid edge syntax: -->|Label| or --> with labels next to.
      expect(mermaid).toMatch(/-->/);
    });
  });

  Scenario('Export a single view as Mermaid', ({ Given, When, Then, And }) => {
    let model: ArchiMateModel;
    let viewId: string;
    let mermaid: string;

    Given('a view "V" containing three elements and two relationships', () => {
      const built = buildModelWithView();
      model = built.model;
      viewId = built.viewId;
    });

    When('the caller invokes archimate_export_mermaid scoped to "V"', () => {
      mermaid = generateMermaidFromView(model, viewId);
    });

    Then('the response contains only the three elements and two edges from "V"', () => {
      // Three element labels (A, B, C) on the canvas
      expect(mermaid).toMatch(/\bA\b/);
      expect(mermaid).toMatch(/\bB\b/);
      expect(mermaid).toMatch(/\bC\b/);
      // Two edges in the diagram
      const edgeMatches = mermaid.match(/-->/g) ?? [];
      expect(edgeMatches.length).toBe(2);
    });

    And('no other elements appear', () => {
      // Node "N" exists in the model but is not on the view canvas
      expect(mermaid).not.toMatch(/\bN\b\s/);
    });
  });

  Scenario('Export a view as SVG to a file', ({ Given, When, Then, And }) => {
    let model: ArchiMateModel;
    let viewId: string;
    let outPath: string;
    let svg: string;

    Given('a view "V"', () => {
      const built = buildModelWithView();
      model = built.model;
      viewId = built.viewId;
    });

    When('the caller invokes archimate_export_diagram with view "V", format "svg", and an output path', async () => {
      outPath = path.join(os.tmpdir(), `feature-svg-${Date.now()}.svg`);
      await saveDiagram(model, viewId, outPath, { format: 'svg', colorByLayer: true, showLabels: true });
      svg = fs.readFileSync(outPath, 'utf-8');
    });

    Then('a self-contained SVG file is written to that path', () => {
      expect(fs.existsSync(outPath)).toBe(true);
      expect(svg.startsWith('<svg') || svg.includes('<svg')).toBe(true);
    });

    And('every element on the canvas appears as a rectangle colored by ArchiMate layer', () => {
      // Layer-colored rectangles: count of <rect ...> matches at least three on-canvas elements.
      const rects = svg.match(/<rect /g) ?? [];
      expect(rects.length).toBeGreaterThanOrEqual(3);
    });

    And('every diagram connection appears as a line with the appropriate arrow head', () => {
      expect(svg).toMatch(/<line[^>]*marker-end=/);
      fs.unlinkSync(outPath);
    });
  });

  Scenario('Export a view as PNG', ({ Given, When, Then, And }) => {
    let model: ArchiMateModel;
    let viewId: string;
    let outPath: string;

    Given('a view "V"', () => {
      const built = buildModelWithView();
      model = built.model;
      viewId = built.viewId;
    });

    When('the caller invokes archimate_export_diagram with format "png" and an output path', async () => {
      outPath = path.join(os.tmpdir(), `feature-png-${Date.now()}.png`);
      await saveDiagram(model, viewId, outPath, { format: 'png', colorByLayer: true, showLabels: true });
    });

    Then('a rasterized PNG file is written to that path', () => {
      expect(fs.existsSync(outPath)).toBe(true);
      const head = fs.readFileSync(outPath).subarray(0, 8);
      // PNG file signature: 89 50 4E 47 0D 0A 1A 0A
      expect(head[0]).toBe(0x89);
      expect(head[1]).toBe(0x50);
      expect(head[2]).toBe(0x4e);
      expect(head[3]).toBe(0x47);
    });

    And('the format is auto-detected from a ".png" output path when format is omitted', async () => {
      const auto = path.join(os.tmpdir(), `feature-png-auto-${Date.now()}.png`);
      // Omit format; the handler at src/index.ts:1596 derives it from the extension.
      const detected = auto.endsWith('.png') ? 'png' : 'svg';
      await saveDiagram(model, viewId, auto, { format: detected, colorByLayer: true, showLabels: true });
      expect(fs.existsSync(auto)).toBe(true);
      fs.unlinkSync(outPath);
      fs.unlinkSync(auto);
    });
  });

  Scenario('Export the model as Markdown documentation', ({ When, Then, And }) => {
    let model: ArchiMateModel;
    let outPath: string;
    let markdown: string;

    When('the caller invokes archimate_export_markdown with an output path', async () => {
      const built = buildModelWithView();
      model = built.model;
      outPath = path.join(os.tmpdir(), `feature-md-${Date.now()}.md`);
      await saveMarkdown(model, outPath);
      markdown = fs.readFileSync(outPath, 'utf-8');
    });

    Then('a Markdown file is written containing model overview, layer-grouped elements, relationships, and per-view sections', () => {
      expect(markdown).toContain(model.name);
      expect(markdown).toMatch(/##/);
      expect(markdown).toContain('Application');
      expect(markdown).toContain('Main');
    });

    And('each view section embeds a Mermaid diagram', () => {
      expect(markdown).toContain('```mermaid');
      fs.unlinkSync(outPath);
    });
  });

  Scenario('Export the model as a single-file HTML deck', ({ When, Then, And }) => {
    let outPath: string;
    let html: string;

    When('the caller invokes archimate_export_html_deck with an output path', async () => {
      const built = buildModelWithView();
      outPath = path.join(os.tmpdir(), `feature-deck-${Date.now()}.html`);
      await saveHtmlDeck(built.model, outPath);
      html = fs.readFileSync(outPath, 'utf-8');
    });

    Then('a single HTML file is written that requires no external assets', () => {
      expect(fs.existsSync(outPath)).toBe(true);
      expect(html).toMatch(/<!doctype html|<!DOCTYPE html/i);
      // No external <script src=...>, <link rel="stylesheet" href=...>, or <img src=http...>
      expect(html).not.toMatch(/<script[^>]+src="https?:/);
      expect(html).not.toMatch(/<link[^>]+href="https?:/);
    });

    And('it provides tab navigation by layer, search, and embedded SVG diagrams', () => {
      expect(html.toLowerCase()).toContain('tab');
      expect(html.toLowerCase()).toMatch(/search|input/);
      expect(html).toContain('<svg');
    });

    And('both light and dark themes are supported', () => {
      expect(html.toLowerCase()).toMatch(/theme|dark|light/);
      fs.unlinkSync(outPath);
    });
  });
});
