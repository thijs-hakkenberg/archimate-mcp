# ADR 003: Synchronous File Operations for Audit Logging

## Status

Accepted

## Context

The audit logging system needs to write log entries reliably. Two approaches were considered:

1. **Asynchronous streams** - Using Node.js `fs.createWriteStream()` with async writes
2. **Synchronous operations** - Using `fs.openSync()`, `fs.writeSync()`, `fs.closeSync()`

Initial implementation used async streams, but tests revealed issues with data not being flushed before file close.

## Decision

We chose synchronous file operations for audit logging:

```typescript
const fd = fs.openSync(this.logPath, 'a');
fs.writeSync(fd, JSON.stringify(entry) + '\n');
fs.closeSync(fd);
```

Reasons:

1. **Reliability** - Synchronous writes guarantee data is persisted before returning
2. **Audit requirements** - Audit logs must not lose entries, even on crash
3. **Simplicity** - No need for complex flush/drain handling
4. **Testability** - Easier to verify log contents in tests immediately after write

## Consequences

### Positive
- Guaranteed write completion before function returns
- Simpler code with no async complexity
- Reliable test assertions
- Better crash resistance for audit data

### Negative
- Blocking I/O during log writes
- Slightly higher latency for logged operations
- File handle opened/closed for each entry

### Mitigation
The performance impact is minimal because:
- Audit entries are small (< 1KB each)
- Logging is optional and can be disabled
- Model operations are infrequent relative to I/O capabilities
