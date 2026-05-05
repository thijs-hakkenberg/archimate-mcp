Feature: Export and rendering
  The server produces views and documentation in multiple presentation
  formats: Mermaid flowcharts, native SVG (and PNG via Sharp), Markdown
  documentation, and a self-contained interactive HTML deck.

  Background:
    Given a current model with at least one view

  Scenario: Export the entire model as a Mermaid flowchart
    When the caller invokes archimate_export_mermaid with no view filter
    Then the response includes a flowchart with every element grouped by layer
    And relationships are rendered as labeled edges

  Scenario: Export a single view as Mermaid
    Given a view "V" containing three elements and two relationships
    When the caller invokes archimate_export_mermaid scoped to "V"
    Then the response contains only the three elements and two edges from "V"
    And no other elements appear

  Scenario: Export a view as SVG to a file
    Given a view "V"
    When the caller invokes archimate_export_diagram with view "V", format "svg", and an output path
    Then a self-contained SVG file is written to that path
    And every element on the canvas appears as a rectangle colored by ArchiMate layer
    And every diagram connection appears as a line with the appropriate arrow head

  Scenario: Export a view as PNG
    Given a view "V"
    When the caller invokes archimate_export_diagram with format "png" and an output path
    Then a rasterized PNG file is written to that path
    And the format is auto-detected from a ".png" output path when format is omitted

  Scenario: Export the model as Markdown documentation
    When the caller invokes archimate_export_markdown with an output path
    Then a Markdown file is written containing model overview, layer-grouped elements, relationships, and per-view sections
    And each view section embeds a Mermaid diagram

  Scenario: Export the model as a single-file HTML deck
    When the caller invokes archimate_export_html_deck with an output path
    Then a single HTML file is written that requires no external assets
    And it provides tab navigation by layer, search, and embedded SVG diagrams
    And both light and dark themes are supported
