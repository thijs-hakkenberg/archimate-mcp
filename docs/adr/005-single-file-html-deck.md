# ADR 005: Self-Contained Single-File HTML Deck Export

## Status

Accepted

## Context

We wanted to provide an interactive HTML presentation of ArchiMate models. Options considered:

1. **Multi-file website** - HTML + separate CSS + JavaScript + image files
2. **Static site generator** - Using tools like Jekyll or Hugo
3. **Single-file HTML** - All CSS, JavaScript, and images embedded inline
4. **Template engine** - Using Handlebars or similar for HTML generation

## Decision

We chose self-contained single-file HTML output:

- All CSS embedded in `<style>` tags
- All JavaScript embedded in `<script>` tags
- SVG diagrams embedded inline
- No external dependencies or CDN links

Reasons:

1. **Portability** - Single file can be shared via email, Slack, etc.
2. **Offline viewing** - Works without internet connection
3. **No build step** - No template compilation needed
4. **Simplicity** - One file to generate and manage
5. **Security** - No external scripts or CDN dependencies

## Consequences

### Positive
- Easy to share and distribute
- Works offline
- No hosting required for basic viewing
- No external dependencies or security concerns
- Can be opened directly in any browser

### Negative
- Larger file size than split files (CSS/JS repeated in each export)
- No caching benefit for repeated views
- Limited interactivity compared to full web applications

### Implementation Details

The HTML deck exporter (`src/exporters/html-deck-exporter.ts`):
- Generates complete HTML document with embedded CSS
- Tab-based navigation for each ArchiMate layer
- Element cards with relationship details
- Search/filter functionality via embedded JavaScript
- Light/dark theme support
- Embedded SVG diagrams for views
