# ADR 006: Layer-Specific Element Creation Tools

## Status

Accepted

## Context

We needed to design the API for creating ArchiMate elements. Options considered:

1. **Single generic tool** - `archimate_create_element(type, name, ...)` with all 59 types
2. **Layer-specific tools** - `archimate_create_business_element`, `archimate_create_application_element`, etc.
3. **Fully typed tools** - One tool per element type (59 tools)

## Decision

We chose layer-specific element creation tools (7 tools total):

- `archimate_create_motivation_element` - Stakeholder, Driver, Assessment, Goal, etc.
- `archimate_create_strategy_element` - Resource, Capability, ValueStream, CourseOfAction
- `archimate_create_business_element` - BusinessActor, BusinessProcess, etc.
- `archimate_create_application_element` - ApplicationComponent, DataObject, etc.
- `archimate_create_technology_element` - Node, Device, SystemSoftware, etc.
- `archimate_create_implementation_element` - WorkPackage, Deliverable, etc.
- `archimate_create_composite_element` - Grouping, Location

Reasons:

1. **LLM guidance** - Layer grouping helps LLMs select appropriate element types
2. **Manageable tool count** - 7 tools vs 59 tools
3. **Enumerated types** - Each tool has an enum of valid types for that layer
4. **Educational** - Tool names teach ArchiMate layer structure
5. **Documentation** - Each tool's description explains its element types

## Consequences

### Positive
- Clear mental model for users and LLMs
- Enum parameters prevent invalid element types
- Tool descriptions serve as documentation
- Reasonable number of tools to list/browse

### Negative
- User must know which layer an element belongs to
- Cannot create elements without knowing the layer

### Mitigation
- Tool descriptions include element type definitions
- MCP resource `archimate://spec/elements` provides full catalog
- Error messages guide users to correct layer if type is wrong
