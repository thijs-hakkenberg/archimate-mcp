Feature: ArchiMate Open Exchange Format import and export
  Callers can interoperate with other ArchiMate tools through the
  Open Group's standard XML exchange format. Elements, relationships,
  and views round-trip without loss.

  Scenario: Export a model to Open Exchange XML
    Given a current model with elements, relationships, and at least one view
    When the caller invokes archimate_export_exchange with output path "/tmp/model.xml"
    Then a valid XML file is written to that path
    And the file uses the namespace "http://www.opengroup.org/xsd/archimate/3.0/"
    And every element, relationship, and view from the model is represented in the XML

  Scenario: Exported XML includes the xsi:type attributes the schema requires
    When the caller invokes archimate_export_exchange
    Then every view, node, and connection element carries its xsi:type attribute
    And the file validates against the ArchiMate 3.0 exchange schema

  Scenario: Import a model from Open Exchange XML
    Given an Open Exchange XML file at "/tmp/imported.xml"
    When the caller invokes archimate_import_exchange with that path
    Then the file is parsed and becomes the current model
    And every element, relationship, and view in the file is loaded
    And folder organization matches the layer of each element

  Scenario: Round-trip preserves the model
    Given a current model "M"
    When the caller exports "M" to exchange XML and re-imports the result
    Then the reimported model has the same elements, relationships, and views as "M"
    And every documentation field is preserved verbatim

  Scenario: Importing malformed XML returns a clear error
    Given a file at "/tmp/bad.xml" that is not valid Open Exchange XML
    When the caller invokes archimate_import_exchange with that path
    Then the call returns an error identifying the parsing failure
    And the previously-current model is left unchanged
