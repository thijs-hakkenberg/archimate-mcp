Feature: Audit logging
  Every model-mutating operation can be recorded as a line of NDJSON for
  audit, forensics, or compliance. Logging can be configured at runtime
  or controlled via an environment variable.

  Scenario: Enable audit logging at runtime to a chosen path
    Given audit logging is currently disabled
    When the caller invokes archimate_configure_audit with enabled true and log path "/tmp/audit.ndjson"
    Then subsequent model-mutating tool calls append a JSON line to "/tmp/audit.ndjson"
    And each line includes timestamp, event name, action, success flag, and duration in milliseconds

  Scenario: Disable audit logging
    Given audit logging is enabled
    When the caller invokes archimate_configure_audit with enabled false
    Then subsequent tool calls write nothing to the log file

  Scenario: Audit log entries are written synchronously and survive abrupt shutdown
    Given audit logging is enabled
    When a tool call completes and the process exits immediately afterward
    Then the corresponding log line is durably present on disk

  Scenario: ARCHIMATE_AUDIT_LOG environment variable controls logging at startup
    Given the server is launched with ARCHIMATE_AUDIT_LOG set to "/tmp/audit.ndjson"
    Then audit logging is enabled by default and writes to that path
    And no archimate_configure_audit call is required

  Scenario: ARCHIMATE_AUDIT_LOG set to "disabled" turns logging off at startup
    Given the server is launched with ARCHIMATE_AUDIT_LOG set to "disabled"
    Then audit logging is off by default
    And tool calls produce no audit output until archimate_configure_audit explicitly enables it

  Scenario: Read recent audit entries
    Given an audit log file with at least 100 entries
    When the caller invokes archimate_get_audit_log with no limit
    Then the response includes the most recent 50 entries by default
    When the caller invokes archimate_get_audit_log with limit 10
    Then the response includes the most recent 10 entries

  Scenario: Failed operations are still logged
    Given audit logging is enabled
    When a tool call fails (for example a relationship validation rejection)
    Then a log line is still emitted with success false and the error message
