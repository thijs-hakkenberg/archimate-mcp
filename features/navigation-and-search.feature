Feature: Navigation and search
  Callers can list elements with optional filtering, fetch a single
  element with its relationship neighbors, search by name, and get a
  layer-by-layer summary of the model's contents.

  Background:
    Given a current model with elements across multiple layers

  Scenario: List every element in the model
    When the caller invokes archimate_list_elements with no filter
    Then the response includes every element across all layers
    And each entry shows id, name, type, and layer

  Scenario: List elements filtered by layer
    When the caller invokes archimate_list_elements with layer "Application"
    Then the response includes only Application layer elements
    And no Business, Technology, Motivation, or Strategy elements appear

  Scenario: List elements filtered by specific element type
    When the caller invokes archimate_list_elements with element_type "BusinessActor"
    Then the response includes only BusinessActor elements
    And other Business types like BusinessProcess are excluded

  Scenario: Get a single element with its relationships
    Given an ApplicationComponent "Order Service" with two outgoing and one incoming relationships
    When the caller invokes archimate_get_element with that id
    Then the response includes the element's full attributes and documentation
    And the response lists all three relationships, marked by direction

  Scenario: Find elements by name pattern (case-insensitive)
    Given elements named "Order Service", "Customer Order", and "Payment"
    When the caller invokes archimate_find_elements with pattern "order"
    Then the response includes both "Order Service" and "Customer Order"
    And "Payment" is excluded

  Scenario: Find elements supports regex
    Given elements named "Service A", "Service B", and "Process"
    When the caller invokes archimate_find_elements with pattern "^Service"
    Then the response includes "Service A" and "Service B"
    And "Process" is excluded

  Scenario: Find elements scoped to a layer
    Given an ApplicationComponent "Service" and a BusinessRole "Service"
    When the caller invokes archimate_find_elements with pattern "Service" and layer "Application"
    Then only the ApplicationComponent is returned

  Scenario: Layer summary returns counts grouped by layer
    Given a model with 3 Business, 5 Application, and 2 Technology elements
    When the caller invokes archimate_layer_summary
    Then the response reports 3 for Business, 5 for Application, 2 for Technology
    And empty layers report a count of zero rather than being omitted
