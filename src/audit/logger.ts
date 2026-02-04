/**
 * Audit logging system for ArchiMate MCP Server
 * Logs all model mutations in NDJSON format
 */

import * as fs from 'fs';
import * as path from 'path';

export interface AuditEntry {
  timestamp: string;
  event: string;
  action: 'create' | 'update' | 'delete' | 'read' | 'export' | 'import';
  elementType?: string;
  elementId?: string;
  elementName?: string;
  relationshipType?: string;
  relationshipId?: string;
  details?: Record<string, unknown>;
  durationMs: number;
  success: boolean;
  error?: string;
}

export type AuditLogInput = Omit<AuditEntry, 'timestamp'>;

const DEFAULT_LOG_FILENAME = 'archimate-audit.ndjson';

export class AuditLogger {
  private logPath: string;
  private enabled: boolean;
  private fd: number | null = null;

  constructor(logPath?: string) {
    // Check environment variable first
    const envPath = process.env.ARCHIMATE_AUDIT_LOG;

    if (envPath === 'disabled') {
      this.enabled = false;
      this.logPath = logPath || path.join(process.cwd(), DEFAULT_LOG_FILENAME);
    } else {
      this.enabled = true;
      this.logPath = logPath || envPath || path.join(process.cwd(), DEFAULT_LOG_FILENAME);
    }
  }

  private ensureFileDescriptor(): void {
    if (this.fd === null) {
      // Ensure directory exists
      const dir = path.dirname(this.logPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Open file for appending
      this.fd = fs.openSync(this.logPath, 'a');
    }
  }

  /**
   * Log an audit entry (synchronous write for reliability)
   */
  log(entry: AuditLogInput): void {
    if (!this.enabled) {
      return;
    }

    const fullEntry: AuditEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
    };

    this.ensureFileDescriptor();
    fs.writeSync(this.fd!, JSON.stringify(fullEntry) + '\n');
  }

  /**
   * Enable or disable logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get the current log file path
   */
  getLogPath(): string {
    return this.logPath;
  }

  /**
   * Change the log file path
   */
  setLogPath(newPath: string): void {
    this.close();
    this.logPath = newPath;
  }

  /**
   * Read recent entries from the log file
   * @param limit Maximum number of entries to return (returns last N entries)
   */
  getEntries(limit?: number): AuditEntry[] {
    // Close current fd to ensure all data is flushed
    this.close();

    if (!fs.existsSync(this.logPath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.logPath, 'utf-8');
      const lines = content.trim().split('\n').filter((line) => line.length > 0);
      const entries = lines.map((line) => JSON.parse(line) as AuditEntry);

      if (limit && limit > 0 && entries.length > limit) {
        return entries.slice(-limit);
      }

      return entries;
    } catch {
      return [];
    }
  }

  /**
   * Close the file descriptor
   */
  close(): void {
    if (this.fd !== null) {
      fs.closeSync(this.fd);
      this.fd = null;
    }
  }
}

// Singleton instance for use throughout the application
let _auditLogger: AuditLogger | null = null;

export function getAuditLogger(): AuditLogger {
  if (!_auditLogger) {
    _auditLogger = new AuditLogger();
  }
  return _auditLogger;
}

export function resetAuditLogger(): void {
  if (_auditLogger) {
    _auditLogger.close();
    _auditLogger = null;
  }
}

/**
 * Helper function to wrap a tool handler with audit logging
 */
export async function withAuditLog<T>(
  event: string,
  action: AuditEntry['action'],
  handler: () => Promise<T>,
  extractDetails?: (result: T) => Partial<AuditLogInput>
): Promise<T> {
  const logger = getAuditLogger();
  const startTime = Date.now();

  try {
    const result = await handler();
    const durationMs = Date.now() - startTime;

    const details = extractDetails ? extractDetails(result) : {};

    logger.log({
      event,
      action,
      success: true,
      durationMs,
      ...details,
    });

    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;

    logger.log({
      event,
      action,
      success: false,
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}
