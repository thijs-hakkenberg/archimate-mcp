/**
 * HTML Deck exporter for ArchiMate models
 * Generates a single self-contained HTML file with interactive navigation
 */

import type {
  ArchiMateModel,
  ArchiMateElement,
  ArchiMateRelationship,
  ArchiMateFolder,
  Layer,
} from '../model/types.js';
import { getLayerForElementType } from '../model/types.js';
import { generateMermaidFromView } from './mermaid-exporter.js';
import { generateSvg } from './svg-exporter.js';

export interface HtmlDeckOptions {
  title?: string;
  theme?: 'light' | 'dark';
  includeSearch?: boolean;
  embedDiagrams?: boolean;
}

const DEFAULT_OPTIONS: Required<HtmlDeckOptions> = {
  title: '',
  theme: 'light',
  includeSearch: true,
  embedDiagrams: true,
};

// Layer display order
const LAYER_ORDER: Array<{ key: string; label: string; layer?: Layer }> = [
  { key: 'motivation', label: 'Motivation', layer: 'Motivation' },
  { key: 'strategy', label: 'Strategy', layer: 'Strategy' },
  { key: 'business', label: 'Business', layer: 'Business' },
  { key: 'application', label: 'Application', layer: 'Application' },
  { key: 'technology', label: 'Technology', layer: 'Technology' },
  { key: 'implementation', label: 'Implementation', layer: 'Implementation' },
  { key: 'views', label: 'Views' },
];

// Layer colors
const LAYER_COLORS: Record<string, string> = {
  motivation: '#CCCCFF',
  strategy: '#F5DEAA',
  business: '#FFFFB5',
  application: '#B5FFFF',
  technology: '#C9E7B7',
  implementation: '#FFE0E0',
  views: '#E8E8E8',
};

/**
 * Get all elements from all folders in the model
 */
function getAllElements(model: ArchiMateModel): ArchiMateElement[] {
  const elements: ArchiMateElement[] = [];

  function collectFromFolder(folder: ArchiMateFolder): void {
    elements.push(...folder.elements);
    folder.subfolders.forEach(collectFromFolder);
  }

  model.folders.forEach(collectFromFolder);
  return elements;
}

/**
 * Get element by ID from model
 */
function getElementById(model: ArchiMateModel, id: string): ArchiMateElement | undefined {
  return getAllElements(model).find((e) => e.id === id);
}

/**
 * Get relationships for an element
 */
function getRelationshipsForElement(
  model: ArchiMateModel,
  elementId: string
): ArchiMateRelationship[] {
  return model.relationships.filter(
    (r) => r.sourceId === elementId || r.targetId === elementId
  );
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format element type for display
 */
function formatElementType(type: string): string {
  return type.replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Generate CSS styles
 */
function generateStyles(theme: 'light' | 'dark'): string {
  const isDark = theme === 'dark';
  const bg = isDark ? '#1a1a2e' : '#ffffff';
  const text = isDark ? '#e8e8e8' : '#333333';
  const cardBg = isDark ? '#16213e' : '#f8f8f8';
  const borderColor = isDark ? '#444' : '#ddd';
  const navBg = isDark ? '#0f3460' : '#f0f0f0';

  return `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: ${bg};
      color: ${text};
      line-height: 1.6;
    }
    header {
      background: ${navBg};
      padding: 1rem 2rem;
      border-bottom: 1px solid ${borderColor};
      position: sticky;
      top: 0;
      z-index: 100;
    }
    header h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }
    nav {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      align-items: center;
    }
    nav button {
      padding: 0.5rem 1rem;
      border: 1px solid ${borderColor};
      border-radius: 4px;
      background: ${cardBg};
      color: ${text};
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    nav button:hover {
      background: ${isDark ? '#1a3a5c' : '#e0e0e0'};
    }
    nav button.active {
      background: ${isDark ? '#e94560' : '#4a90d9'};
      color: white;
      border-color: transparent;
    }
    .search-container {
      margin-left: auto;
    }
    .search-container input {
      padding: 0.5rem 1rem;
      border: 1px solid ${borderColor};
      border-radius: 4px;
      background: ${cardBg};
      color: ${text};
      width: 200px;
    }
    main {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }
    section {
      display: none;
    }
    section.active {
      display: block;
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }
    .card {
      background: ${cardBg};
      border: 1px solid ${borderColor};
      border-radius: 8px;
      padding: 1rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .card-type {
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      background: var(--layer-color);
    }
    .card h3 {
      font-size: 1.1rem;
      margin-bottom: 0.5rem;
    }
    .card p {
      font-size: 0.9rem;
      color: ${isDark ? '#aaa' : '#666'};
      margin-bottom: 0.5rem;
    }
    .relationships {
      font-size: 0.85rem;
      border-top: 1px solid ${borderColor};
      padding-top: 0.5rem;
      margin-top: 0.5rem;
    }
    .relationships ul {
      list-style: none;
      padding-left: 0;
    }
    .relationships li {
      padding: 0.2rem 0;
      color: ${isDark ? '#888' : '#777'};
    }
    .view-container {
      background: ${cardBg};
      border: 1px solid ${borderColor};
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }
    .view-container h3 {
      margin-bottom: 1rem;
    }
    .view-diagram {
      background: white;
      border-radius: 4px;
      padding: 1rem;
      overflow: auto;
    }
    .view-diagram svg {
      max-width: 100%;
      height: auto;
    }
    .mermaid {
      background: white;
      padding: 1rem;
      border-radius: 4px;
    }
    .hidden {
      display: none !important;
    }
    @media (max-width: 768px) {
      header {
        padding: 1rem;
      }
      main {
        padding: 1rem;
      }
      .cards {
        grid-template-columns: 1fr;
      }
      nav button {
        padding: 0.4rem 0.8rem;
        font-size: 0.8rem;
      }
    }
  `;
}

/**
 * Generate element card HTML
 */
function generateElementCard(
  element: ArchiMateElement,
  model: ArchiMateModel,
  layerKey: string
): string {
  const layerColor = LAYER_COLORS[layerKey] || '#e8e8e8';
  const relationships = getRelationshipsForElement(model, element.id);

  let relationshipsHtml = '';
  if (relationships.length > 0) {
    const relItems = relationships.slice(0, 5).map((rel) => {
      const isSource = rel.sourceId === element.id;
      const otherId = isSource ? rel.targetId : rel.sourceId;
      const other = getElementById(model, otherId);
      const otherName = other ? escapeHtml(other.name) : 'Unknown';
      const direction = isSource ? '→' : '←';
      return `<li>${rel.type} ${direction} ${otherName}</li>`;
    });

    if (relationships.length > 5) {
      relItems.push(`<li>... and ${relationships.length - 5} more</li>`);
    }

    relationshipsHtml = `
      <div class="relationships">
        <strong>Relationships:</strong>
        <ul>${relItems.join('')}</ul>
      </div>
    `;
  }

  return `
    <div class="card" data-name="${escapeHtml(element.name.toLowerCase())}" style="--layer-color: ${layerColor}">
      <div class="card-header">
        <span class="card-type">${formatElementType(element.type)}</span>
      </div>
      <h3>${escapeHtml(element.name)}</h3>
      ${element.documentation ? `<p>${escapeHtml(element.documentation)}</p>` : ''}
      ${relationshipsHtml}
    </div>
  `;
}

/**
 * Generate view section HTML
 */
function generateViewSection(
  model: ArchiMateModel,
  embedDiagrams: boolean
): string {
  if (model.diagrams.length === 0) {
    return '<p>No views defined in this model.</p>';
  }

  const views = model.diagrams.map((diagram) => {
    let diagramHtml = '';

    if (diagram.objects.length > 0) {
      if (embedDiagrams) {
        try {
          const svg = generateSvg(model, diagram.id, { colorByLayer: true });
          diagramHtml = `<div class="view-diagram">${svg}</div>`;
        } catch {
          diagramHtml = '<p>Unable to render diagram</p>';
        }
      } else {
        try {
          const mermaid = generateMermaidFromView(model, diagram.id, {
            direction: 'TB',
            includeRelationshipLabels: true,
          });
          diagramHtml = `
            <div class="mermaid">
              ${escapeHtml(mermaid)}
            </div>
          `;
        } catch {
          diagramHtml = '<p>Unable to render diagram</p>';
        }
      }
    }

    return `
      <div class="view-container">
        <h3>${escapeHtml(diagram.name)}</h3>
        ${diagram.viewpoint ? `<p><strong>Viewpoint:</strong> ${escapeHtml(diagram.viewpoint)}</p>` : ''}
        ${diagram.documentation ? `<p>${escapeHtml(diagram.documentation)}</p>` : ''}
        ${diagramHtml}
      </div>
    `;
  });

  return views.join('');
}

/**
 * Generate JavaScript for interactivity
 */
function generateScript(includeSearch: boolean): string {
  return `
    document.addEventListener('DOMContentLoaded', function() {
      const navButtons = document.querySelectorAll('nav button[data-layer]');
      const sections = document.querySelectorAll('section[data-layer]');

      // Tab switching
      navButtons.forEach(button => {
        button.addEventListener('click', function() {
          const layer = this.dataset.layer;

          // Update active button
          navButtons.forEach(b => b.classList.remove('active'));
          this.classList.add('active');

          // Show corresponding section
          sections.forEach(s => {
            s.classList.toggle('active', s.dataset.layer === layer);
          });
        });
      });

      // Show first non-empty section by default
      const firstButton = document.querySelector('nav button[data-layer]');
      if (firstButton) {
        firstButton.click();
      }

      ${includeSearch ? `
      // Search functionality
      const searchInput = document.querySelector('input[type="search"]');
      if (searchInput) {
        searchInput.addEventListener('input', function() {
          const query = this.value.toLowerCase();
          const cards = document.querySelectorAll('.card');

          cards.forEach(card => {
            const name = card.dataset.name || '';
            const matches = name.includes(query);
            card.classList.toggle('hidden', !matches && query.length > 0);
          });
        });
      }
      ` : ''}
    });
  `;
}

/**
 * Generate complete HTML deck from ArchiMate model
 */
export function generateHtmlDeck(
  model: ArchiMateModel,
  options: HtmlDeckOptions = {}
): string {
  const opts: Required<HtmlDeckOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
    title: options.title || model.name,
  };

  // Get all elements grouped by layer
  const allElements = getAllElements(model);
  const elementsByLayer = new Map<string, ArchiMateElement[]>();

  for (const element of allElements) {
    const layer = getLayerForElementType(element.type);
    const layerKey = layer.toLowerCase().replace(/\s+/g, '');
    // Map Physical to technology
    const normalizedKey = layerKey === 'physical' ? 'technology' : layerKey;

    if (!elementsByLayer.has(normalizedKey)) {
      elementsByLayer.set(normalizedKey, []);
    }
    elementsByLayer.get(normalizedKey)!.push(element);
  }

  // Generate navigation buttons
  const navButtons = LAYER_ORDER
    .filter((l) => {
      if (l.key === 'views') return model.diagrams.length > 0;
      return (elementsByLayer.get(l.key)?.length || 0) > 0;
    })
    .map((l) => `<button data-layer="${l.key}">${l.label}</button>`)
    .join('\n        ');

  // Generate sections
  const sections = LAYER_ORDER.map((layerInfo) => {
    if (layerInfo.key === 'views') {
      return `
        <section data-layer="views">
          <h2>Views</h2>
          ${generateViewSection(model, opts.embedDiagrams)}
        </section>
      `;
    }

    const elements = elementsByLayer.get(layerInfo.key) || [];
    const cards = elements
      .map((e) => generateElementCard(e, model, layerInfo.key))
      .join('\n');

    return `
      <section data-layer="${layerInfo.key}">
        <h2>${layerInfo.label} Layer</h2>
        <div class="cards">
          ${cards || '<p>No elements in this layer.</p>'}
        </div>
      </section>
    `;
  }).join('\n');

  // Search input
  const searchHtml = opts.includeSearch
    ? `
      <div class="search-container">
        <input type="search" placeholder="Search elements..." aria-label="Search elements">
      </div>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="en" data-theme="${opts.theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(opts.title)}</title>
  <style>${generateStyles(opts.theme)}</style>
</head>
<body>
  <header>
    <h1>${escapeHtml(opts.title)}</h1>
    <nav>
      ${navButtons}
      ${searchHtml}
    </nav>
  </header>
  <main>
    ${sections}
  </main>
  <script>${generateScript(opts.includeSearch)}</script>
</body>
</html>`;
}

/**
 * Save HTML deck to file
 */
export async function saveHtmlDeck(
  model: ArchiMateModel,
  outputPath: string,
  options: HtmlDeckOptions = {}
): Promise<void> {
  const fs = await import('fs/promises');
  const html = generateHtmlDeck(model, options);
  await fs.writeFile(outputPath, html, 'utf-8');
}
