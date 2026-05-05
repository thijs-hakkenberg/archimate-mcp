Feature: View construction with auto-drawn connections
  A diagram view is built by creating it and then placing elements onto
  the canvas. When an element is added, the server inspects existing
  relationships and draws diagram connections to any element already on
  the canvas, mirroring the Archi desktop drag behavior.

  Background:
    Given a current model

  Scenario: Create an empty view
    When the caller invokes archimate_create_view with name "Main View"
    Then the view is created with no diagram objects
    And the response includes the generated view id

  Scenario: Add a single element to an empty view draws no connections
    Given an empty view "V"
    And an ApplicationComponent "A" with no relationships
    When the caller invokes archimate_add_to_view with view "V" and element "A"
    Then "A" is placed on the canvas at an auto-assigned position
    And the response field autoConnectedRelationships is an empty list

  Scenario: Adding a second element auto-draws the relationship between them
    Given a view "V" containing diagram object for ApplicationComponent "A"
    And a Serving relationship from "A" to ApplicationComponent "B"
    When the caller invokes archimate_add_to_view with view "V" and element "B"
    Then a diagram connection is drawn from A's diagram object to B's diagram object
    And the connection's direction matches the relationship (source A, target B)
    And A's diagram object lists the new connection in sourceConnections
    And B's diagram object lists the new connection's id in targetConnectionIds
    And autoConnectedRelationships contains exactly one entry referencing the Serving relationship

  Scenario: Auto-draw preserves direction when the new element is the relationship target
    Given a view "V" containing diagram object for ApplicationComponent "A"
    And a Serving relationship from ApplicationComponent "B" to "A"
    When the caller invokes archimate_add_to_view with view "V" and element "B"
    Then a diagram connection is drawn from B's diagram object to A's diagram object

  Scenario: Triangle of relationships produces three connections after three adds
    Given relationships A→B, B→C, and A→C among three ApplicationComponents
    And an empty view "V"
    When the caller adds A, then B, then C to "V"
    Then the view contains exactly three diagram connections, one per relationship
    And no connection is duplicated

  Scenario: Auto-draw is idempotent across repeated adds
    Given a view that already contains diagram objects for "A" and "B" with a connection between them
    When the caller invokes archimate_add_to_view again for "A"
    Then no additional diagram connection is created
    And autoConnectedRelationships is empty

  Scenario: Caller can opt out of auto-drawing
    Given a view containing diagram object for "A"
    And a relationship from "A" to "B"
    When the caller invokes archimate_add_to_view with element "B" and auto_connect set to false
    Then "B" is placed on the canvas with no connections drawn
    And autoConnectedRelationships is empty

  Scenario: Manually add a connection between two on-canvas elements
    Given a view containing diagram objects for "A" and "B" with no connection between them
    And a relationship between "A" and "B"
    When the caller invokes archimate_add_connection_to_view with the relationship and both diagram-object ids
    Then a diagram connection is added with the supplied orientation
    And subsequent auto-draws skip this relationship to avoid duplication

  Scenario: List all views in the model
    When the caller invokes archimate_list_views
    Then the response includes every diagram view's id, name, and viewpoint
