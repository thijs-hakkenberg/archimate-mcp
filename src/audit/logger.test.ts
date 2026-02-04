import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { AuditLogger, type AuditEntry } from './logger.js';

describe('AuditLogger', () => {
  let testLogPath: string;
  let logger: AuditLogger;

  beforeEach(() => {
    testLogPath = path.join(process.cwd(), `test-audit-${Date.now()}.ndjson`);
    logger = new AuditLogger(testLogPath);
  });

  afterEach(() => {
    logger.close();
    // Clean up test log file
    if (fs.existsSync(testLogPath)) {
      fs.unlinkSync(testLogPath);
    }
  });

  describe('constructor', () => {
    it('should create logger with specified path', () => {
      expect(logger.getLogPath()).toBe(testLogPath);
    });

    it('should use default path when not specified', () => {
      const defaultLogger = new AuditLogger();
      expect(defaultLogger.getLogPath()).toContain('archimate-audit.ndjson');
      defaultLogger.close();
    });

    it('should be enabled by default', () => {
      expect(logger.isEnabled()).toBe(true);
    });
  });

  describe('log', () => {
    it('should write NDJSON entries to file', () => {
      logger.log({
        event: 'archimate_create_business_element',
        action: 'create',
        elementType: 'BusinessActor',
        elementId: 'id-123',
        elementName: 'Customer',
        success: true,
        durationMs: 5,
      });

      // Force flush
      logger.close();

      const content = fs.readFileSync(testLogPath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(1);

      const entry = JSON.parse(lines[0]) as AuditEntry;
      expect(entry.event).toBe('archimate_create_business_element');
      expect(entry.action).toBe('create');
      expect(entry.elementName).toBe('Customer');
      expect(entry.success).toBe(true);
    });

    it('should include timestamp in ISO 8601 format', () => {
      logger.log({
        event: 'test_event',
        action: 'read',
        success: true,
        durationMs: 1,
      });

      logger.close();

      const content = fs.readFileSync(testLogPath, 'utf-8');
      const entry = JSON.parse(content.trim()) as AuditEntry;
      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include element details for mutations', () => {
      logger.log({
        event: 'archimate_create_application_element',
        action: 'create',
        elementType: 'ApplicationComponent',
        elementId: 'id-456',
        elementName: 'Order Service',
        success: true,
        durationMs: 3,
      });

      logger.close();

      const content = fs.readFileSync(testLogPath, 'utf-8');
      const entry = JSON.parse(content.trim()) as AuditEntry;
      expect(entry.elementType).toBe('ApplicationComponent');
      expect(entry.elementId).toBe('id-456');
      expect(entry.elementName).toBe('Order Service');
    });

    it('should log errors with error message', () => {
      logger.log({
        event: 'archimate_delete_element',
        action: 'delete',
        elementId: 'id-789',
        success: false,
        error: 'Element not found',
        durationMs: 2,
      });

      logger.close();

      const content = fs.readFileSync(testLogPath, 'utf-8');
      const entry = JSON.parse(content.trim()) as AuditEntry;
      expect(entry.success).toBe(false);
      expect(entry.error).toBe('Element not found');
    });

    it('should include additional details when provided', () => {
      logger.log({
        event: 'archimate_export_diagram',
        action: 'export',
        success: true,
        durationMs: 150,
        details: {
          format: 'svg',
          viewId: 'view-123',
          outputPath: '/path/to/output.svg',
        },
      });

      logger.close();

      const content = fs.readFileSync(testLogPath, 'utf-8');
      const entry = JSON.parse(content.trim()) as AuditEntry;
      expect(entry.details).toEqual({
        format: 'svg',
        viewId: 'view-123',
        outputPath: '/path/to/output.svg',
      });
    });

    it('should not write when disabled', () => {
      logger.setEnabled(false);
      logger.log({
        event: 'test_event',
        action: 'read',
        success: true,
        durationMs: 1,
      });

      logger.close();

      expect(fs.existsSync(testLogPath)).toBe(false);
    });

    it('should resume writing when re-enabled', () => {
      logger.setEnabled(false);
      logger.log({ event: 'ignored', action: 'read', success: true, durationMs: 1 });

      logger.setEnabled(true);
      logger.log({ event: 'logged', action: 'read', success: true, durationMs: 1 });

      logger.close();

      const content = fs.readFileSync(testLogPath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(1);
      expect(JSON.parse(lines[0]).event).toBe('logged');
    });
  });

  describe('setEnabled', () => {
    it('should toggle logging on/off', () => {
      expect(logger.isEnabled()).toBe(true);
      logger.setEnabled(false);
      expect(logger.isEnabled()).toBe(false);
      logger.setEnabled(true);
      expect(logger.isEnabled()).toBe(true);
    });
  });

  describe('getEntries', () => {
    it('should return recent entries from log file', () => {
      logger.log({ event: 'event1', action: 'create', success: true, durationMs: 1 });
      logger.log({ event: 'event2', action: 'read', success: true, durationMs: 2 });
      logger.log({ event: 'event3', action: 'update', success: true, durationMs: 3 });

      logger.close();

      const newLogger = new AuditLogger(testLogPath);
      const entries = newLogger.getEntries();
      newLogger.close();

      expect(entries).toHaveLength(3);
      expect(entries[0].event).toBe('event1');
      expect(entries[2].event).toBe('event3');
    });

    it('should limit number of returned entries', () => {
      for (let i = 0; i < 10; i++) {
        logger.log({ event: `event${i}`, action: 'read', success: true, durationMs: 1 });
      }

      logger.close();

      const newLogger = new AuditLogger(testLogPath);
      const entries = newLogger.getEntries(5);
      newLogger.close();

      expect(entries).toHaveLength(5);
      // Should return last 5 entries
      expect(entries[0].event).toBe('event5');
      expect(entries[4].event).toBe('event9');
    });

    it('should return empty array if log file does not exist', () => {
      const nonExistentLogger = new AuditLogger('/non/existent/path.ndjson');
      const entries = nonExistentLogger.getEntries();
      expect(entries).toEqual([]);
      nonExistentLogger.close();
    });
  });

  describe('setLogPath', () => {
    it('should change log file path', () => {
      const newPath = path.join(process.cwd(), `test-audit-new-${Date.now()}.ndjson`);

      logger.log({ event: 'old_path', action: 'read', success: true, durationMs: 1 });
      logger.setLogPath(newPath);
      logger.log({ event: 'new_path', action: 'read', success: true, durationMs: 1 });

      logger.close();

      // Old file should have one entry
      const oldContent = fs.readFileSync(testLogPath, 'utf-8');
      expect(oldContent.trim().split('\n')).toHaveLength(1);

      // New file should have one entry
      const newContent = fs.readFileSync(newPath, 'utf-8');
      expect(newContent.trim().split('\n')).toHaveLength(1);
      expect(JSON.parse(newContent.trim()).event).toBe('new_path');

      // Clean up new file
      fs.unlinkSync(newPath);
    });
  });

  describe('environment variable', () => {
    const originalEnv = process.env.ARCHIMATE_AUDIT_LOG;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.ARCHIMATE_AUDIT_LOG = originalEnv;
      } else {
        delete process.env.ARCHIMATE_AUDIT_LOG;
      }
    });

    it('should use ARCHIMATE_AUDIT_LOG env var for path', () => {
      const envPath = '/tmp/custom-audit.ndjson';
      process.env.ARCHIMATE_AUDIT_LOG = envPath;

      const envLogger = new AuditLogger();
      expect(envLogger.getLogPath()).toBe(envPath);
      envLogger.close();
    });

    it('should disable logging when env var is "disabled"', () => {
      process.env.ARCHIMATE_AUDIT_LOG = 'disabled';

      const envLogger = new AuditLogger();
      expect(envLogger.isEnabled()).toBe(false);
      envLogger.close();
    });
  });
});
