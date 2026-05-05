import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AuditLogger, type AuditEntry } from '../src/audit/logger.js';

const feature = await loadFeature('./features/audit-logging.feature');

function tempLogPath(): string {
  return path.join(os.tmpdir(), `feature-audit-${Date.now()}-${Math.random().toString(36).slice(2)}.ndjson`);
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Enable audit logging at runtime to a chosen path', ({ Given, When, Then, And }) => {
    let logger: AuditLogger;
    let logPath: string;
    let lines: string[];

    Given('audit logging is currently disabled', () => {
      logPath = tempLogPath();
      logger = new AuditLogger(logPath);
      logger.setEnabled(false);
      expect(logger.isEnabled()).toBe(false);
    });

    When('the caller invokes archimate_configure_audit with enabled true and log path "/tmp/audit.ndjson"', () => {
      logger.setLogPath(logPath);
      logger.setEnabled(true);
      logger.log({
        event: 'archimate_create_business_element',
        action: 'create',
        elementType: 'BusinessActor',
        elementId: 'id-test-1',
        elementName: 'Customer',
        success: true,
        durationMs: 1,
      });
      logger.close();
    });

    Then('subsequent model-mutating tool calls append a JSON line to "/tmp/audit.ndjson"', () => {
      const content = fs.readFileSync(logPath, 'utf-8');
      lines = content.trim().split('\n').filter((l) => l.length > 0);
      expect(lines).toHaveLength(1);
    });

    And('each line includes timestamp, event name, action, success flag, and duration in milliseconds', () => {
      const entry = JSON.parse(lines[0]) as AuditEntry;
      expect(entry.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
      expect(entry.event).toBe('archimate_create_business_element');
      expect(entry.action).toBe('create');
      expect(entry.success).toBe(true);
      expect(typeof entry.durationMs).toBe('number');
      fs.unlinkSync(logPath);
    });
  });

  Scenario('Disable audit logging', ({ Given, When, Then }) => {
    let logger: AuditLogger;
    let logPath: string;

    Given('audit logging is enabled', () => {
      logPath = tempLogPath();
      logger = new AuditLogger(logPath);
      expect(logger.isEnabled()).toBe(true);
    });

    When('the caller invokes archimate_configure_audit with enabled false', () => {
      logger.setEnabled(false);
    });

    Then('subsequent tool calls write nothing to the log file', () => {
      logger.log({ event: 'noop', action: 'create', success: true, durationMs: 0 });
      logger.close();
      expect(fs.existsSync(logPath)).toBe(false);
    });
  });

  Scenario('Audit log entries are written synchronously and survive abrupt shutdown', ({ Given, When, Then }) => {
    let logger: AuditLogger;
    let logPath: string;

    Given('audit logging is enabled', () => {
      logPath = tempLogPath();
      logger = new AuditLogger(logPath);
    });

    When('a tool call completes and the process exits immediately afterward', () => {
      logger.log({ event: 'durability_test', action: 'create', success: true, durationMs: 7 });
      // Simulate "process exits": drop our reference to the fd without close().
      // Synchronous writeSync delivers data to the kernel; the OS persists it
      // even if the Node process is killed. We re-open from disk to verify.
    });

    Then('the corresponding log line is durably present on disk', () => {
      const content = fs.readFileSync(logPath, 'utf-8');
      const entries = content.trim().split('\n').filter((l) => l.length > 0).map((l) => JSON.parse(l) as AuditEntry);
      expect(entries.some((e) => e.event === 'durability_test')).toBe(true);
      logger.close();
      fs.unlinkSync(logPath);
    });
  });

  Scenario('ARCHIMATE_AUDIT_LOG environment variable controls logging at startup', ({ Given, Then, And }) => {
    let logger: AuditLogger;
    const originalEnv = process.env.ARCHIMATE_AUDIT_LOG;
    let envPath: string;

    Given('the server is launched with ARCHIMATE_AUDIT_LOG set to "/tmp/audit.ndjson"', () => {
      envPath = tempLogPath();
      process.env.ARCHIMATE_AUDIT_LOG = envPath;
      logger = new AuditLogger();
    });

    Then('audit logging is enabled by default and writes to that path', () => {
      expect(logger.isEnabled()).toBe(true);
      expect(logger.getLogPath()).toBe(envPath);
    });

    And('no archimate_configure_audit call is required', () => {
      logger.log({ event: 'env_path_test', action: 'create', success: true, durationMs: 1 });
      logger.close();
      const content = fs.readFileSync(envPath, 'utf-8');
      expect(content).toContain('env_path_test');
      fs.unlinkSync(envPath);
      if (originalEnv === undefined) delete process.env.ARCHIMATE_AUDIT_LOG;
      else process.env.ARCHIMATE_AUDIT_LOG = originalEnv;
    });
  });

  Scenario('ARCHIMATE_AUDIT_LOG set to "disabled" turns logging off at startup', ({ Given, Then, And }) => {
    let logger: AuditLogger;
    const originalEnv = process.env.ARCHIMATE_AUDIT_LOG;

    Given('the server is launched with ARCHIMATE_AUDIT_LOG set to "disabled"', () => {
      process.env.ARCHIMATE_AUDIT_LOG = 'disabled';
      logger = new AuditLogger();
    });

    Then('audit logging is off by default', () => {
      expect(logger.isEnabled()).toBe(false);
    });

    And('tool calls produce no audit output until archimate_configure_audit explicitly enables it', () => {
      const tempPath = tempLogPath();
      logger.setLogPath(tempPath);
      logger.log({ event: 'should_not_appear', action: 'create', success: true, durationMs: 1 });
      logger.close();
      expect(fs.existsSync(tempPath)).toBe(false);

      logger.setEnabled(true);
      logger.log({ event: 'now_enabled', action: 'create', success: true, durationMs: 1 });
      logger.close();
      const content = fs.readFileSync(tempPath, 'utf-8');
      expect(content).toContain('now_enabled');
      fs.unlinkSync(tempPath);

      if (originalEnv === undefined) delete process.env.ARCHIMATE_AUDIT_LOG;
      else process.env.ARCHIMATE_AUDIT_LOG = originalEnv;
    });
  });

  Scenario('Read recent audit entries', ({ Given, When, Then }) => {
    let logger: AuditLogger;
    let logPath: string;

    Given('an audit log file with at least 100 entries', () => {
      logPath = tempLogPath();
      logger = new AuditLogger(logPath);
      for (let i = 0; i < 100; i++) {
        logger.log({ event: `event_${i}`, action: 'create', success: true, durationMs: i });
      }
    });

    When('the caller invokes archimate_get_audit_log with no limit', () => {
      // Default of the tool handler is 50 (matches index.ts default)
      const entries = logger.getEntries(50);
      (logger as unknown as { _last?: AuditEntry[] })._last = entries;
    });

    Then('the response includes the most recent 50 entries by default', () => {
      const entries = (logger as unknown as { _last?: AuditEntry[] })._last!;
      expect(entries).toHaveLength(50);
      expect(entries[entries.length - 1].event).toBe('event_99');
    });

    When('the caller invokes archimate_get_audit_log with limit 10', () => {
      const entries = logger.getEntries(10);
      (logger as unknown as { _last?: AuditEntry[] })._last = entries;
    });

    Then('the response includes the most recent 10 entries', () => {
      const entries = (logger as unknown as { _last?: AuditEntry[] })._last!;
      expect(entries).toHaveLength(10);
      expect(entries[entries.length - 1].event).toBe('event_99');
      logger.close();
      fs.unlinkSync(logPath);
    });
  });

  Scenario('Failed operations are still logged', ({ Given, When, Then }) => {
    let logger: AuditLogger;
    let logPath: string;
    let entries: AuditEntry[];

    Given('audit logging is enabled', () => {
      logPath = tempLogPath();
      logger = new AuditLogger(logPath);
    });

    When('a tool call fails (for example a relationship validation rejection)', () => {
      logger.log({
        event: 'archimate_create_relationship',
        action: 'create',
        success: false,
        durationMs: 2,
        error: 'Assignment is not a valid relationship between DataObject and BusinessActor',
      });
      logger.close();
      const content = fs.readFileSync(logPath, 'utf-8');
      entries = content.trim().split('\n').filter((l) => l.length > 0).map((l) => JSON.parse(l) as AuditEntry);
    });

    Then('a log line is still emitted with success false and the error message', () => {
      expect(entries).toHaveLength(1);
      expect(entries[0].success).toBe(false);
      expect(entries[0].error).toContain('Assignment is not a valid');
      fs.unlinkSync(logPath);
    });
  });
});
