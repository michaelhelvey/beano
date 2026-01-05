const getAnnotationsGetter = async () => {
  try {
    const { context, isSpanContextValid, trace } = await import("@opentelemetry/api");

    return () => {
      let annotations = {};
      // enable correlation of logs with traces:
      // c.f. https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/packages/instrumentation-pino/src/instrumentation.ts
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
    return () => ({});
  }
};

const annotationsGetter = await getAnnotationsGetter();

export type Logger = (...args: string[]) => void;
const jsonLogger = (annotations: () => Record<string, string>, ...args: string[]) =>
  process.stdout.write(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      pid: process.pid,
      msg: args.join(" "),
      ...annotations(),
    }) + "\n",
  );
const textLogger = (annotations: () => Record<string, string>, ...args: string[]) =>
  process.stdout.write(
    `${new Date().toISOString()} pid=${process.pid.toString()} ${args.join(" ")}${Object.entries(annotations()).reduce((a, c) => `${a}, ${c[0]}=${c[1]}`, "")}\n`,
  );

export const getLogger = (mod: string): Logger => {
  if (process.env.NODE_ENV === "test" && !process.env.LOG_IN_TEST) return () => {};
  else if (process.env.NODE_ENV === "production")
    return (...args: string[]) => jsonLogger(annotationsGetter, `[${mod}]:`, ...args);
  else return (...args: string[]) => textLogger(annotationsGetter, `[${mod}]:`, ...args);
};
