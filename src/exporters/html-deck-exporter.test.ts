import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateHtmlDeck,
  type HtmlDeckOptions,
} from './html-deck-exporter.js';
import {
  createTestModel,
  createTestModelWithView,
  createMinimalModel,
  resetIdCounter,
} from '../__tests__/fixtures/sample-model.js';

describe('html-deck-exporter', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe('generateHtmlDeck', () => {
    it('should generate valid HTML5 document', () => {
      const model = createTestModel();
      const html = generateHtmlDeck(model);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
      expect(html).toContain('<head>');
      expect(html).toContain('</head>');
      expect(html).toContain('<body>');
      expect(html).toContain('</body>');
    });

    it('should include model title', () => {
      const model = createTestModel();
      const html = generateHtmlDeck(model, { title: 'My Architecture' });

      expect(html).toContain('<title>My Architecture</title>');
    });

    it('should use model name as default title', () => {
      const model = createTestModel();
      const html = generateHtmlDeck(model);

      expect(html).toContain('<title>Test Architecture Model</title>');
    });

    it('should include embedded CSS', () => {
      const model = createTestModel();
      const html = generateHtmlDeck(model);

      expect(html).toContain('<style>');
      expect(html).toContain('</style>');
    });

    it('should include layer navigation tabs', () => {
      const model = createTestModel();
      const html = generateHtmlDeck(model);

      expect(html).toContain('data-layer="business"');
      expect(html).toContain('data-layer="application"');
      expect(html).toContain('data-layer="technology"');
    });

    it('should include element cards with details', () => {
      const model = createTestModel();
      const html = generateHtmlDeck(model);

      // Should have element names
      expect(html).toContain('Customer');
      expect(html).toContain('Order Process');
      expect(html).toContain('Order Application');
    });

    it('should include search functionality when enabled', () => {
      const model = createTestModel();
      const html = generateHtmlDeck(model, { includeSearch: true });

      expect(html).toContain('type="search"');
      expect(html).toContain('search');
    });

    it('should not include search when disabled', () => {
      const model = createTestModel();
      const html = generateHtmlDeck(model, { includeSearch: false });

      expect(html).not.toContain('type="search"');
    });

    it('should include views section', () => {
      const model = createTestModelWithView();
      const html = generateHtmlDeck(model);

      expect(html).toContain('data-layer="views"');
      expect(html).toContain('Main Architecture View');
    });

    it('should embed SVG diagrams when enabled', () => {
      const model = createTestModelWithView();
      const html = generateHtmlDeck(model, { embedDiagrams: true });

      expect(html).toContain('<svg');
    });

    it('should use Mermaid when SVG embedding is disabled', () => {
      const model = createTestModelWithView();
      const html = generateHtmlDeck(model, { embedDiagrams: false });

      expect(html).toContain('mermaid');
    });

    it('should support light theme', () => {
      const model = createTestModel();
      const html = generateHtmlDeck(model, { theme: 'light' });

      expect(html).toContain('data-theme="light"');
    });

    it('should support dark theme', () => {
      const model = createTestModel();
      const html = generateHtmlDeck(model, { theme: 'dark' });

      expect(html).toContain('data-theme="dark"');
    });

    it('should include embedded JavaScript for interactivity', () => {
      const model = createTestModel();
      const html = generateHtmlDeck(model);

      expect(html).toContain('<script>');
      expect(html).toContain('</script>');
    });

    it('should handle empty model gracefully', () => {
      const model = createTestModel();
      model.folders.forEach((f) => (f.elements = []));
      model.relationships = [];
      model.diagrams = [];

      const html = generateHtmlDeck(model);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    });

    it('should include relationship information in element cards', () => {
      const model = createTestModel();
      const html = generateHtmlDeck(model);

      // Should show relationship info
      expect(html).toMatch(/Assignment|Serving|Realization/);
    });

    it('should be self-contained with no external dependencies', () => {
      const model = createTestModel();
      const html = generateHtmlDeck(model);

      // Should not reference external CSS or JS files
      expect(html).not.toMatch(/href="https?:\/\//);
      // Exception for Mermaid CDN if used
      const mermaidMatch = html.match(/src="https?:\/\//g);
      if (mermaidMatch) {
        expect(mermaidMatch.length).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('default options', () => {
    it('should use sensible defaults', () => {
      const model = createTestModel();
      const html = generateHtmlDeck(model);

      // Should have light theme by default
      expect(html).toContain('data-theme="light"');
      // Should have search by default
      expect(html).toContain('search');
    });
  });
});
