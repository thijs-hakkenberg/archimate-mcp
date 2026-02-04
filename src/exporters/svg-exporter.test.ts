import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateSvg,
  type DiagramExportOptions,
} from './svg-exporter.js';
import {
  createTestModel,
  createTestModelWithView,
  resetIdCounter,
} from '../__tests__/fixtures/sample-model.js';

describe('svg-exporter', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe('generateSvg', () => {
    it('should generate valid SVG with proper declaration', () => {
      const model = createTestModelWithView();
      const viewId = model.diagrams[0].id;
      const svg = generateSvg(model, viewId);

      expect(svg).toContain('<svg');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('</svg>');
    });

    it('should include viewBox attribute', () => {
      const model = createTestModelWithView();
      const viewId = model.diagrams[0].id;
      const svg = generateSvg(model, viewId);

      expect(svg).toMatch(/viewBox="[\d\s.-]+"/);
    });

    it('should position elements according to bounds', () => {
      const model = createTestModelWithView();
      const viewId = model.diagrams[0].id;
      const svg = generateSvg(model, viewId);

      // Should have transform or x/y attributes for positioning
      expect(svg).toMatch(/transform="translate\([\d.-]+,\s*[\d.-]+\)"|x="[\d.-]+"\s*y="[\d.-]+"/);
    });

    it('should include element labels', () => {
      const model = createTestModelWithView();
      const viewId = model.diagrams[0].id;
      const svg = generateSvg(model, viewId, { showLabels: true });

      expect(svg).toContain('<text');
      expect(svg).toContain('Customer');
    });

    it('should not include labels when disabled', () => {
      const model = createTestModelWithView();
      const viewId = model.diagrams[0].id;
      const svg = generateSvg(model, viewId, { showLabels: false });

      expect(svg).not.toContain('>Customer<');
    });

    it('should color-code elements by layer when enabled', () => {
      const model = createTestModelWithView();
      const viewId = model.diagrams[0].id;
      const svg = generateSvg(model, viewId, { colorByLayer: true });

      // Should include business layer yellow color
      expect(svg).toMatch(/#FFFFB5|fill="[^"]*yellow/i);
      // Should include application layer blue color
      expect(svg).toMatch(/#B5FFFF|fill="[^"]*cyan/i);
    });

    it('should use specified background color', () => {
      const model = createTestModelWithView();
      const viewId = model.diagrams[0].id;
      const svg = generateSvg(model, viewId, { backgroundColor: '#f0f0f0' });

      expect(svg).toContain('#f0f0f0');
    });

    it('should throw error for non-existent view', () => {
      const model = createTestModelWithView();

      expect(() => generateSvg(model, 'non-existent-view')).toThrow();
    });

    it('should include relationship lines', () => {
      const model = createTestModelWithView();
      const viewId = model.diagrams[0].id;
      const svg = generateSvg(model, viewId);

      // Should have path or line elements for relationships
      expect(svg).toMatch(/<path|<line/);
    });

    it('should render rectangles for elements', () => {
      const model = createTestModelWithView();
      const viewId = model.diagrams[0].id;
      const svg = generateSvg(model, viewId);

      expect(svg).toContain('<rect');
    });

    it('should use proper dimensions when specified', () => {
      const model = createTestModelWithView();
      const viewId = model.diagrams[0].id;
      const svg = generateSvg(model, viewId, { width: 800, height: 600 });

      expect(svg).toMatch(/width="800"/);
      expect(svg).toMatch(/height="600"/);
    });

    it('should generate valid SVG for empty view', () => {
      const model = createTestModelWithView();
      model.diagrams[0].objects = [];
      const viewId = model.diagrams[0].id;

      const svg = generateSvg(model, viewId);

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });

    it('should include arrow markers for relationships', () => {
      const model = createTestModelWithView();
      const viewId = model.diagrams[0].id;
      const svg = generateSvg(model, viewId);

      // Should have marker definitions for arrows
      expect(svg).toContain('<defs>');
      expect(svg).toContain('<marker');
    });
  });

  describe('default options', () => {
    it('should use sensible defaults', () => {
      const model = createTestModelWithView();
      const viewId = model.diagrams[0].id;
      const svg = generateSvg(model, viewId);

      // Should have elements and labels by default
      expect(svg).toContain('<rect');
      expect(svg).toContain('<text');
    });
  });
});

// PNG tests (need to import generatePng)
import { generatePng } from './svg-exporter.js';

describe('png-export', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it('should generate PNG buffer from view', async () => {
    const model = createTestModelWithView();
    const viewId = model.diagrams[0].id;

    const pngBuffer = await generatePng(model, viewId);

    expect(pngBuffer).toBeInstanceOf(Buffer);
    expect(pngBuffer.length).toBeGreaterThan(0);

    // PNG magic bytes
    expect(pngBuffer[0]).toBe(0x89);
    expect(pngBuffer[1]).toBe(0x50); // P
    expect(pngBuffer[2]).toBe(0x4e); // N
    expect(pngBuffer[3]).toBe(0x47); // G
  });

  it('should throw error for non-existent view', async () => {
    const model = createTestModelWithView();

    await expect(generatePng(model, 'non-existent-view')).rejects.toThrow();
  });
});
