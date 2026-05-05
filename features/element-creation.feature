Feature: Element creation, update, and deletion
  Elements are created through layer-specific tools that constrain the
  caller to types valid for that ArchiMate layer. Once created, elements
  can be updated or deleted; deleting an element also removes its
  relationships.

  Background:
    Given a current model with no elements

  Scenario: Create a Business layer element
    When the caller invokes archimate_create_business_element with type "BusinessActor" and name "Customer"
    Then the response includes a generated element id and reports layer "Business"
    And the element appears in the Business folder of the model
    And subsequent calls can reference the element by its returned id

  Scenario: Create an Application layer element with documentation
    When the caller invokes archimate_create_application_element with type "ApplicationComponent", name "Order Service", and documentation "Handles order placement"
    Then the element is created with the supplied documentation preserved
    And the documentation is round-trippable through save and reopen

  Scenario Outline: Each layer-specific tool only accepts its own types
    When the caller invokes <tool> with element_type "<type>"
    Then the call <result>

    Examples:
      | tool                                  | type                  | result                                     |
      | archimate_create_business_element     | BusinessActor         | succeeds and creates a Business element    |
      | archimate_create_application_element  | ApplicationComponent  | succeeds and creates an Application element|
      | archimate_create_technology_element   | Node                  | succeeds and creates a Technology element  |
      | archimate_create_motivation_element   | Goal                  | succeeds and creates a Motivation element  |
      | archimate_create_strategy_element     | Capability            | succeeds and creates a Strategy element    |

  Scenario: Update an element's name and documentation
    Given an existing ApplicationComponent named "Order Service"
    When the caller invokes archimate_update_element with a new name "Order API" and new documentation "Public order API"
    Then the element's name and documentation are replaced
    And references from other elements and views still resolve via the unchanged id

  Scenario: Deleting an element removes it and any relationships involving it
    Given two ApplicationComponents "A" and "B"
    And a Serving relationship from "A" to "B"
    When the caller invokes archimate_delete_element on "A"
    Then "A" is removed from the model
    And the Serving relationship from "A" to "B" is also removed
    And "B" remains in the model

  Scenario: Deleting an element also removes its diagram objects from views
    Given an ApplicationComponent "X" placed on view "V"
    When the caller invokes archimate_delete_element on "X"
    Then no diagram object referencing "X" remains in "V"
