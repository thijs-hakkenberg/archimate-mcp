# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **ArchiMate Open Exchange Format Support**
  - `archimate_import_exchange` - Import models from ArchiMate 3.0 Open Exchange XML
  - `archimate_export_exchange` - Export models to ArchiMate 3.0 Open Exchange XML
  - Round-trip preservation of elements, relationships, and views

- **Multiple Export Formats**
  - `archimate_export_mermaid` - Generate Mermaid flowchart diagrams
  - `archimate_export_diagram` - Export views as SVG or PNG images
  - `archimate_export_markdown` - Generate comprehensive Markdown documentation
  - `archimate_export_html_deck` - Create interactive HTML presentations

- **Audit Logging System**
  - `archimate_configure_audit` - Enable/disable audit logging, configure log path
  - `archimate_get_audit_log` - Read recent audit log entries
  - NDJSON format for easy parsing and analysis
  - Environment variable configuration (`ARCHIMATE_AUDIT_LOG`)

- **Test Infrastructure**
  - Vitest testing framework with 122+ tests
  - Test coverage reporting
  - Test fixtures and model factories

- **Dependencies**
  - Added `sharp` for PNG diagram generation
  - Added `vitest` and `@vitest/coverage-v8` for testing

### Changed
- Total MCP tools increased from 24 to 32
- Updated README with comprehensive documentation
- Added feature comparison matrix with competing servers

## [0.1.3] - 2025-02-04

### Fixed
- Fixed npx execution by adding bin field and shebang to entry point

## [0.1.2] - 2025-02-04

### Added
- Repository field in package.json for npm provenance

## [0.1.1] - 2025-02-04

### Fixed
- Fixed test script for CI compatibility

## [0.1.0] - 2025-02-04

### Added
- Initial release with core ArchiMate MCP server functionality

- **Model Management (3 tools)**
  - `archimate_open_model` - Open coArchi2 repository models
  - `archimate_save_model` - Save model to disk
  - `archimate_create_model` - Create new empty model

- **Navigation (3 tools)**
  - `archimate_list_elements` - List elements with optional filtering
  - `archimate_get_element` - Get element details with relationships
  - `archimate_find_elements` - Search elements by name pattern

- **Element Creation (7 tools)**
  - Layer-specific tools for Motivation, Strategy, Business, Application, Technology, Implementation, and Composite elements
  - Full ArchiMate 3.2 element type support (59 types)

- **Relationships (3 tools)**
  - `archimate_create_relationship` - Create validated relationships
  - `archimate_list_relationships` - List relationships with filtering
  - `archimate_get_valid_relationships` - Query valid relationship types

- **Views/Diagrams (4 tools)**
  - `archimate_list_views` - List diagram views
  - `archimate_create_view` - Create new views
  - `archimate_add_to_view` - Add elements to views
  - `archimate_add_connection_to_view` - Add relationship connections

- **Modification (3 tools)**
  - `archimate_update_element` - Update element properties
  - `archimate_delete_element` - Delete elements and relationships
  - `archimate_delete_relationship` - Delete relationships

- **Analysis (2 tools)**
  - `archimate_layer_summary` - Get element counts by layer
  - `archimate_impact_analysis` - Analyze element dependencies

- **MCP Resources**
  - `archimate://spec/elements` - Element type catalog
  - `archimate://spec/relationships` - Relationship type catalog
  - `archimate://model/summary` - Current model summary

- **ArchiMate 3.2 Compliance**
  - Full relationship validation against specification
  - Helpful error messages with suggestions

[Unreleased]: https://github.com/thijs-hakkenberg/archimate-mcp/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/thijs-hakkenberg/archimate-mcp/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/thijs-hakkenberg/archimate-mcp/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/thijs-hakkenberg/archimate-mcp/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/thijs-hakkenberg/archimate-mcp/releases/tag/v0.1.0
