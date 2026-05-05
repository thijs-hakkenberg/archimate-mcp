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

  Scenario: Layer summary returns counts grouped by layer and element type
    Given a model with 1 BusinessActor, 2 BusinessProcess, 5 ApplicationComponent, and 2 Node elements
    When the caller invokes archimate_layer_summary
    Then the response includes totals for elements, relationships, and views
    And the byLayer map reports per-element-type counts within each populated layer
    And byLayer["Business"] contains BusinessActor: 1 and BusinessProcess: 2
    And byLayer["Application"] contains ApplicationComponent: 5
    And byLayer["Technology"] contains Node: 2
    And layers with no elements (e.g. Motivation, Strategy) are omitted from byLayer
