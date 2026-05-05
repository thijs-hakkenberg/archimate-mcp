Feature: Impact analysis
  Callers can traverse an element's relationship graph in either
  direction up to a configurable depth to understand what it depends on
  or what depends on it.

  Background:
    Given a current model

  Scenario: Outgoing impact at depth 1 lists immediate downstream elements
    Given ApplicationComponent "Order Service" Serving "Customer" and "Sales Rep"
    When the caller invokes archimate_impact_analysis on "Order Service" with direction "outgoing" and depth 1
    Then the response lists "Customer" and "Sales Rep" as direct outgoing dependencies
    And no transitive dependencies appear

  Scenario: Incoming impact at depth 1 lists immediate upstream elements
    Given Node "Web Server" Assigned to ApplicationComponent "Order Service"
    And TechnologyService "Database Service" Serving "Order Service"
    When the caller invokes archimate_impact_analysis on "Order Service" with direction "incoming" and depth 1
    Then the response lists "Web Server" and "Database Service" as direct upstream dependencies

  Scenario: Both-direction impact at depth 2 walks two hops in either direction
    Given a chain Node → ApplicationComponent → BusinessProcess → BusinessActor
    When the caller invokes archimate_impact_analysis on the ApplicationComponent with direction "both" and depth 2
    Then the response includes the Node and BusinessProcess at depth 1
    And includes the BusinessActor at depth 2
    And does not extend further

  Scenario: Default depth is 2
    When the caller invokes archimate_impact_analysis with no depth specified
    Then traversal walks at most two hops in the requested direction
    And the response's maxDepth field reports 2

  Scenario: Default direction is "both"
    When the caller invokes archimate_impact_analysis with no direction specified
    Then the response's direction field reports "both"
    And both incoming and outgoing edges are traversed
