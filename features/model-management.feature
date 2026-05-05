Feature: Model management
  An MCP caller can create new ArchiMate models, open existing coArchi2
  repositories, and save changes back to disk.

  Scenario: Create a new empty model in a fresh directory
    Given an empty directory at "/tmp/new-model"
    When the caller invokes archimate_create_model with name "MyModel" and that path
    Then a model.archimate file is written to that directory
    And the model becomes the current model for subsequent calls
    And the response includes the generated model id and the path

  Scenario: Creating a model in a non-existent directory fails clearly
    Given the path "/tmp/does-not-exist" does not exist on disk
    When the caller invokes archimate_create_model targeting that path
    Then the call returns an error referencing the missing directory
    And no current model is set

  Scenario: Open an existing coArchi2 model
    Given a coArchi2 repository directory containing a valid model.archimate file
    When the caller invokes archimate_open_model with that path
    Then the model is parsed and becomes the current model
    And the response reports element counts grouped by ArchiMate layer

  Scenario: Save the current model back to its source path
    Given a current model that was opened from "/tmp/existing"
    When the caller invokes archimate_save_model with no path argument
    Then the model is written to "/tmp/existing/model.archimate"
    And the on-disk XML reflects every change made since the model was opened

  Scenario: Save the current model to a different path
    Given a current model
    When the caller invokes archimate_save_model with path "/tmp/elsewhere"
    Then the model is written to "/tmp/elsewhere/model.archimate"
    And subsequent saves with no path target the new path
