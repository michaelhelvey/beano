/* eslint-disable @typescript-eslint/prefer-function-type, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import assert from "node:assert/strict";
import util from "node:util";

const levels = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
export type Level = (typeof levels)[number];

/**
 * Logger interface with level methods. Call directly for info level.
 *
 * @example
 * ```typescript
 * const logger = getLogger("my-module");
 * logger("info message"); // logs at info level
 * logger.debug("debug details");
 * logger.error("something failed", { code: 500 });
 * ```
 */
export type Logger = { (...args: any[]): void } & Record<Level, (...args: any[]) => void>;

type Formatter = (mod: string, level: Level, annotations: Record<string, string>, ...args: any[]) => string;
export type Writer = (s: string) => void;
export type Annotater = () => Record<string, string>;

/**
 * Human-readable text formatter with timestamps. Default in development.
 *
 * @example
 * ```typescript
 * await setup({ formatter: textFormatter });
 * ```
 */
export const textFormatter: Formatter = (mod, level, annotations, ...data) => {
  let result = `[${new Date().toISOString()}]: ${level.toUpperCase()} (${mod}): `;
  for (const d of data) {
    if (typeof d === "string") result += `${d} `;
    else result += `${util.inspect(d)} `;
  }
  if (Object.keys(annotations).length) {
    result += `${util.inspect(annotations)} `;
  }
  return result;
};

/**
 * Structured JSON formatter. Default in production.
 *
 * @example
 * ```typescript
 * await setup({ formatter: jsonFormatter });
 * ```
 */
export const jsonFormatter: Formatter = (mod, level, annotations, ...data) => {
  let result: Record<string, unknown> = { ts: new Date().toISOString(), mod, level, ...annotations };
  let i = -1;
  for (const d of data) {
    i++;
    if (d?.constructor === Object) result = { ...result, ...d };
    else result = { ...result, [`arg${i.toString()}`]: typeof d === "string" ? d : util.inspect(d) };
  }
  return JSON.stringify(result);
};
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noopFunction = () => {};
const noopWriter: Writer = noopFunction;

/**
 * Configuration options for logger setup.
 *
 * @example
 * ```typescript
 * const config: SetupDefaults = {
 *   writer: process.stderr.write,
 *   formatter: jsonFormatter,
 *   level: "warn",
 *   annotater: () => ({ env: "prod" })
 * };
 * ```
 */
export interface SetupDefaults {
  writer: Writer;
  formatter: Formatter;
  level: Level;
  annotater: Annotater;
}
const defaultSetupDefaults: SetupDefaults = {
  writer:
    process.env.NODE_ENV === "test" && !process.env.LOG_IN_TEST
      ? noopWriter
      : (s: string) => process.stdout.write(s + "\n"),
  formatter: process.env.NODE_ENV === "production" ? jsonFormatter : textFormatter,
  annotater: () => ({}),
  level: "debug",
};
let setupDefaults: SetupDefaults | null = null;

const maybeOpenTelemetryAnnotater = async () => {
  try {
    const { context, isSpanContextValid, trace } = await import("@opentelemetry/api");
    return () => {
      let annotations = {};
      // see: https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/packages/instrumentation-pino/src/instrumentation.ts
      const spanContext = trace.getSpan(context.active())?.spanContext();
      if (spanContext && isSpanContextValid(spanContext)) {
        annotations = {
          trace_id: spanContext.traceId,
          span_id: spanContext.spanId,
          trace_flags: `0${spanContext.traceFlags.toString(16)}`,
        };
      }
      return annotations;
    };
  } catch (e) {
    void e;
    return () => ({});
  }
};

/**
 * Initialize logger with custom defaults. Automatically enables OpenTelemetry
 * if available.
 *
 * @example
 * ```typescript
 * await setup({ level: "warn", formatter: jsonFormatter });
 * ```
 */
export async function setup(defaults?: Partial<SetupDefaults>) {
  setupDefaults = {
    ...defaultSetupDefaults,
    annotater: await maybeOpenTelemetryAnnotater(),
    ...defaults,
  };
}

await setup();
assert.ok(setupDefaults);

const logImpl =
  (defaults: SetupDefaults, mod: string, level: Level) =>
  (...args: any[]) => {
    defaults.writer(defaults.formatter(mod, level, defaults.annotater(), ...args));
  };

const _getLogger = (defaults: SetupDefaults) => (mod: string) =>
  new Proxy(noopFunction, {
    apply(_target, _self, args) {
      logImpl(defaults, mod, "info")(...args);
    },
    get(_target, prop) {
      assert.ok(levels.includes(prop as Level), `invalid level '${String(prop)}'`);
      const levelNum = levels.indexOf(prop as Level);
      const defaultNum = levels.indexOf(defaults.level);
      if (levelNum < defaultNum) return noopFunction;
      return logImpl(defaults, mod, prop as Level);
    },
  }) as unknown as Logger;

/**
 * Create a logger instance for a module. Logs below configured level are
 * no-ops.
 *
 * @example
 * ```typescript
 * const logger = getLogger("auth");
 * logger("user logged in"); // info level
 * logger.debug("token validated");
 * logger.error("auth failed", { userId: 123 });
 * ```
 */
export const getLogger = _getLogger(setupDefaults);

/**
 * @deprecated Used only in development of the beano package.  Do not use in userspace code.
 */
export const _private = { _getLogger, defaultSetupDefaults };
