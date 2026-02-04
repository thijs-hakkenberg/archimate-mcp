# ArchiMate MCP Server Comparison Matrix

## Overview

| Server | Primary Purpose | npm Package |
|--------|-----------------|-------------|
| **archimate-mcp-server** (this repo) | Full ArchiMate model management | archimate-mcp-server |
| **mcp-architecture-diagrams** | Diagram generation (PlantUML) | - |
| **mcp-Archimate** | Model creation + XML export | @null-pointer/mcp-archimate |
| **archiscribe-mcp** | Read-only model queries | - |

---

## Feature Comparison

### Element Support

| Feature | archimate-mcp-server | mcp-architecture-diagrams | mcp-Archimate | archiscribe-mcp |
|---------|:--------------------:|:-------------------------:|:-------------:|:---------------:|
| **Create Elements** | Yes | No | Yes | No |
| **Read Elements** | Yes | No | No | Yes |
| **Update Elements** | Yes | No | No | No |
| **Delete Elements** | Yes | No | No | No |
| **Motivation Layer** | 10 types | 5 types | 10 types | Read-only |
| **Strategy Layer** | 4 types | 4 types | 4 types | Read-only |
| **Business Layer** | 13 types | 3 types | 13 types | Read-only |
| **Application Layer** | 9 types | 2 types | 9 types | Read-only |
| **Technology Layer** | 17 types | 2 types | 13 types | Read-only |
| **Physical Layer** | 4 types | - | 5 types | Read-only |
| **Implementation Layer** | 5 types | 4 types | 5 types | Read-only |
| **Composite (Grouping/Location)** | Yes | No | Yes | Read-only |
| **Total Element Types** | 59 | ~20 | 55+ | Any |

### Relationship Support

| Feature | archimate-mcp-server | mcp-architecture-diagrams | mcp-Archimate | archiscribe-mcp |
|---------|:--------------------:|:-------------------------:|:-------------:|:---------------:|
| **Create Relationships** | Yes | No | Yes | No |
| **List Relationships** | Yes | No | Yes | Yes |
| **Delete Relationships** | Yes | No | No | No |
| **Composition** | Yes | No | Yes | Read-only |
| **Aggregation** | Yes | No | Yes | Read-only |
| **Assignment** | Yes | Yes | Yes | Read-only |
| **Realization** | Yes | Yes | Yes | Read-only |
| **Serving** | Yes | Yes | Yes | Read-only |
| **Access (R/W/RW)** | Yes | Yes | Yes | Read-only |
| **Influence (+/-/0)** | Yes | Yes | Yes | Read-only |
| **Association** | Yes | Yes | Yes | Read-only |
| **Triggering** | Yes | Yes | Yes | Read-only |
| **Flow** | Yes | Yes | Yes | Read-only |
| **Specialization** | Yes | No | Yes | Read-only |

### Validation

| Feature | archimate-mcp-server | mcp-architecture-diagrams | mcp-Archimate | archiscribe-mcp |
|---------|:--------------------:|:-------------------------:|:-------------:|:---------------:|
| **Relationship Validation** | Full spec | None | Partial | None |
| **Valid Relationship Query** | Yes | No | No | No |
| **Error Suggestions** | Yes | No | Yes | No |
| **ArchiMate 3.2 Compliance** | Yes | No | Partial | No |

### File Formats

| Feature | archimate-mcp-server | mcp-architecture-diagrams | mcp-Archimate | archiscribe-mcp |
|---------|:--------------------:|:-------------------------:|:-------------:|:---------------:|
| **Read .archimate (coArchi)** | Yes | No | No | No |
| **Write .archimate (coArchi)** | Yes | No | No | No |
| **Read ArchiMate XML Exchange** | **Yes** | No | No | Yes |
| **Write ArchiMate XML Exchange** | **Yes** | No | Yes | No |
| **SVG Diagrams** | **Yes** | Yes | No | No |
| **PNG Diagrams** | **Yes** | Yes | No | No |
| **Mermaid Diagrams** | **Yes** | No | Yes | No |
| **Markdown Documentation** | **Yes** | No | No | Yes |
| **HTML Interactive Deck** | **Yes** | No | No | No |

### Views & Diagrams

| Feature | archimate-mcp-server | mcp-architecture-diagrams | mcp-Archimate | archiscribe-mcp |
|---------|:--------------------:|:-------------------------:|:-------------:|:---------------:|
| **List Views** | Yes | No | No | Yes |
| **Create Views** | Yes | No | Yes | No |
| **Add Elements to View** | Yes | No | Yes | No |
| **Add Connections to View** | Yes | No | No | No |
| **Generate Visual Diagrams** | **Yes (SVG/PNG)** | Yes | Yes | No |
| **Viewpoint Support** | Yes | Yes | No | Read-only |
| **Native Rendering** | **Yes** | PlantUML | Mermaid | No |

### Analysis Features

| Feature | archimate-mcp-server | mcp-architecture-diagrams | mcp-Archimate | archiscribe-mcp |
|---------|:--------------------:|:-------------------------:|:-------------:|:---------------:|
| **Impact Analysis** | Yes | No | No | No |
| **Layer Summary** | Yes | No | Yes | No |
| **Dependency Tracking** | Yes | No | No | Partial |
| **Search by Pattern** | Yes | No | No | Yes |
| **Element Statistics** | Yes | No | Yes | No |

### MCP Tools Count

| Server | Tools |
|--------|:-----:|
| **archimate-mcp-server** | **32** |
| mcp-architecture-diagrams | 5 |
| mcp-Archimate | 5 |
| archiscribe-mcp | 4 |

### MCP Resources

| Feature | archimate-mcp-server | mcp-architecture-diagrams | mcp-Archimate | archiscribe-mcp |
|---------|:--------------------:|:-------------------------:|:-------------:|:---------------:|
| **Element Catalog** | Yes | No | Yes | No |
| **Relationship Catalog** | Yes | No | Yes | No |
| **Model Summary** | Yes | No | No | No |

### Infrastructure & Operations

| Feature | archimate-mcp-server | mcp-architecture-diagrams | mcp-Archimate | archiscribe-mcp |
|---------|:--------------------:|:-------------------------:|:-------------:|:---------------:|
| **Runtime** | Node.js 18+ | Node.js + Java | Node.js 16+ | Node.js |
| **External Dependencies** | sharp (optional) | PlantUML JAR | None | None |
| **Model Persistence** | File-based | None | In-memory | Read-only |
| **npx Support** | Yes | No | Yes | No |
| **Audit Logging** | **Yes (NDJSON)** | No | No | Yes |
| **Test Coverage** | **122+ tests** | Unknown | Unknown | Unknown |

---

## Tool Categories Comparison

### archimate-mcp-server (32 tools)

| Category | Count | Tools |
|----------|:-----:|-------|
| Model Management | 3 | open_model, save_model, create_model |
| Navigation | 3 | list_elements, get_element, find_elements |
| Element Creation | 7 | create_motivation/strategy/business/application/technology/implementation/composite_element |
| Relationships | 3 | create_relationship, list_relationships, get_valid_relationships |
| Views/Diagrams | 4 | list_views, create_view, add_to_view, add_connection_to_view |
| Modification | 3 | update_element, delete_element, delete_relationship |
| Analysis | 2 | layer_summary, impact_analysis |
| **Exchange Format** | **2** | import_exchange, export_exchange |
| **Export Tools** | **4** | export_mermaid, export_diagram, export_markdown, export_html_deck |
| **Audit** | **2** | configure_audit, get_audit_log |

### mcp-Archimate (5 tools)

| Category | Count | Tools |
|----------|:-----:|-------|
| Diagram Generation | 1 | generate_archimate_diagram |
| Validation | 1 | validate_archimate_model |
| Discovery | 2 | list_elements, list_relationships |
| Export | 1 | export_xml |

### mcp-architecture-diagrams (5 tools)

| Category | Count | Tools |
|----------|:-----:|-------|
| UML | 1 | generate_uml_diagram |
| C4 | 1 | generate_c4_diagram |
| ArchiMate | 1 | generate_archimate_diagram |
| Discovery | 1 | list_diagram_types |
| Status | 1 | check_plantuml_status |

---

## Summary

### archimate-mcp-server (this repo)
**Strengths:**
- Full CRUD operations on ArchiMate models
- Native coArchi/Archi file format support
- ArchiMate Open Exchange Format import/export
- Complete relationship validation against ArchiMate 3.2 spec
- Impact analysis capability
- Most comprehensive tool set (32 tools)
- View management with element and connection placement
- Multiple export formats: SVG, PNG, Mermaid, Markdown, HTML
- Audit logging with NDJSON format
- Extensive test coverage (122+ tests)
- Native diagram rendering (no external services)

**Unique Features (not in competitors):**
- HTML interactive deck export
- Native SVG/PNG rendering
- coArchi2 file format support
- NDJSON audit logging
- Impact analysis
- Round-trip model preservation

### mcp-architecture-diagrams
**Use Case:** Generating visual architecture diagrams from text
**Strengths:** Multi-format diagrams (UML, C4, ArchiMate), PlantUML quality
**Gaps:** Not a model manager, no persistence, requires Java/PlantUML

### mcp-Archimate
**Use Case:** Creating models with XML export
**Strengths:** Good element coverage, XML export, Mermaid output
**Gaps:** No file import, sparse validation, no impact analysis, no SVG/PNG

### archiscribe-mcp
**Use Case:** Querying existing ArchiMate models for AI consumption
**Strengths:** Read ArchiMate Exchange files, audit logging, markdown output
**Gaps:** Read-only, no model modification, no validation

---

## Competitive Positioning

```
                    Read-Only ←──────────────────────→ Full CRUD
                         │                                  │
                         │    archiscribe-mcp               │
                         │          ↓                       │
    Diagram Gen ←────────┼──────────────────────────────────┼────→ Model Mgmt
                         │                                  │
         mcp-architecture│                       archimate-mcp-server
              -diagrams  │                            (this repo)
                         │    mcp-Archimate                 │
                         │          ↓                       │
                         │                                  │
                    No Validation ←──────────→ Full Validation
```

**archimate-mcp-server occupies the "Full CRUD + Full Validation + Model Management + Multiple Exports" position, which is unique among these implementations.**

---

## Export Format Comparison

| Format | archimate-mcp-server | mcp-architecture-diagrams | mcp-Archimate | archiscribe-mcp |
|--------|:--------------------:|:-------------------------:|:-------------:|:---------------:|
| SVG | Native | PlantUML | No | No |
| PNG | sharp | PlantUML | No | No |
| Mermaid | Yes | No | Yes | No |
| Markdown | Yes | No | No | Yes |
| HTML Deck | **Yes** | No | No | No |
| Exchange XML | Yes | No | Yes | No |
| coArchi | Yes | No | No | No |

**archimate-mcp-server supports the most export formats (7), with HTML deck being a unique offering.**
