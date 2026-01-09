# beano

An extremely simple synchronous logger. Useful for things like AWS lambda functions where you want a simple wrapper
around `console.log` but don't want to bundle large dependencies.

## Getting Started

```shell
<npm|yarn|pnpm|bun> install @michaelhelvey/beano
```

## Usage

### (Optional) Setup

Initialize logger with custom defaults. OpenTelemetry support is automatic if available.

```typescript
import { jsonFormatter, setup, textFormatter } from "@michaelhelvey/beano";

// Use defaults (text in dev, JSON in prod, debug level)
await setup();

// Or customize
await setup({
  level: "warn",
  formatter: jsonFormatter,
  writer: process.stderr.write.bind(process.stderr),
  annotater: () => ({ env: "prod" }),
});
```

**Note: you do not need to call `setup` at all in your code, unless you want to customize the defaults**.

### Formatters

**textFormatter** - Human-readable with timestamps. Default in development.

```
[2026-01-09T12:34:56.789Z]: INFO (my-module): message here
```

**jsonFormatter** - Structured JSON. Default in production.

```json
{ "ts": "2026-01-09T12:34:56.789Z", "mod": "my-module", "level": "info", "arg0": "message here" }
```

### Calling Loggers

Create a logger per module. Call directly for `info` level, or use level methods.

```typescript
import { getLogger } from "@michaelhelvey/beano";

const logger = getLogger("my-module");

// Info level (direct call)
logger("user logged in");

// Level methods
logger.trace("detailed trace");
logger.debug("debug details");
logger.info("info message");
logger.warn("warning");
logger.error("something failed", { code: 500 });
logger.fatal("fatal error");

// Pass objects as additional context
logger.error("request failed", { userId: 123, status: 500 });
```

Logs below configured level become no-ops for zero overhead.
