Feature: Relationship management
  Relationships between elements are validated against the ArchiMate 3.2
  specification at creation time. Invalid combinations are rejected with
  guidance toward a valid alternative.

  Background:
    Given a current model

  Scenario: Create a valid Serving relationship between two application components
    Given an ApplicationComponent "Order API"
    And an ApplicationComponent "Order Service"
    When the caller invokes archimate_create_relationship of type "Serving" from "Order API" to "Order Service"
    Then the relationship is created and stored in the Relations folder
    And the response includes the relationship id, type, and both endpoint names

  Scenario: Create an Access relationship with an access_type modifier
    Given an ApplicationFunction "Process Order"
    And a DataObject "Order Data"
    When the caller invokes archimate_create_relationship of type "Access" from "Process Order" to "Order Data" with access_type "ReadWrite"
    Then the relationship is created with the ReadWrite access modifier preserved

  Scenario: Create an Influence relationship with an influence_modifier
    Given a Driver "Cost Pressure"
    And a Goal "Reduce TCO"
    When the caller invokes archimate_create_relationship of type "Influence" from "Cost Pressure" to "Reduce TCO" with influence_modifier "++"
    Then the relationship is created with the strength modifier preserved

  Scenario: Reject a relationship that ArchiMate 3.2 forbids
    Given a DataObject "Order Data"
    And a BusinessActor "Customer"
    When the caller invokes archimate_create_relationship of type "Assignment" from "Order Data" to "Customer"
    Then the call returns an error stating Assignment is not valid between DataObject and BusinessActor
    And the error suggests valid alternatives such as Realization, Serving, Association, or Flow
    And no relationship is added to the model

  Scenario: Query valid relationship types for a source element type
    When the caller invokes archimate_get_valid_relationships with source_type "ApplicationComponent"
    Then the response lists every target element type that can be reached from ApplicationComponent
    And each target lists the relationship types that are valid for that pair

  Scenario: Query valid relationship types for a specific source-target pair
    When the caller invokes archimate_get_valid_relationships with source_type "ApplicationComponent" and target_type "BusinessProcess"
    Then the response lists only the relationship types valid between those two element types

  Scenario: List relationships filtered by element
    Given an element "Order Service" with three incoming and two outgoing relationships
    When the caller invokes archimate_list_relationships filtered by element id "Order Service" and direction "both"
    Then the response includes all five relationships and no others
    And requesting direction "incoming" returns only the three incoming relationships

  Scenario: Delete a relationship
    Given an existing Serving relationship between two components
    When the caller invokes archimate_delete_relationship with that relationship id
    Then the relationship is removed from the model
    And any diagram connections that visualized it are removed from every view
