import { describe, expect, it, vi } from "vitest";
import { _private, jsonFormatter } from "../index.ts";

describe("logger", () => {
  const { _getLogger, defaultSetupDefaults } = _private;
  const mockDefaults = { ...defaultSetupDefaults, writer: vi.fn() };

  it("constructs a new text logger with levels", () => {
    const logger = _getLogger(mockDefaults)("blah");
    logger("foo", { bar: "baz" });
    const arg = mockDefaults.writer.mock.calls[0][0];
    expect(arg).toMatch(/INFO \(blah\): foo { bar: 'baz' }/i);

    logger.debug("foo", { bar: "baz" });
    const arg2 = mockDefaults.writer.mock.calls[1][0];
    expect(arg2).toMatch(/DEBUG \(blah\): foo { bar: 'baz' }/i);
  });

  it("constructs a new json logger with levels", () => {
    const logger = _getLogger({ ...mockDefaults, formatter: jsonFormatter })("blah");
    logger("foo", { bar: "baz" }, undefined, [1, 2]);
    const arg = mockDefaults.writer.mock.calls[0][0];
    const expected = { mod: "blah", level: "info", arg0: "foo", bar: "baz", arg2: "undefined", arg3: "[ 1, 2 ]" };
    expect(JSON.parse(arg)).toMatchObject(expected);
  });

  it("does nothing for levels below configured level", () => {
    const logger = _getLogger(mockDefaults)("blah");
    logger.trace("whatever");
    expect(mockDefaults.writer).not.toHaveBeenCalled();
  });
});
