import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import { Logger, LogLevel } from "../logger";

describe("Logger", () => {
  const originalEnv = process.env;
  const levels: LogLevel[] = ["error", "warn", "info", "debug"];

  beforeEach(() => {
    levels.forEach((level) => {
      jest.spyOn(console, level).mockImplementation(() => undefined);
    });
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = originalEnv;
  });

  test("when LOG_LEVEL is error, logs only error messages", () => {
    process.env.LOG_LEVEL = "error";
    const logger = new Logger();

    (["error"] as const).forEach((level) => {
      logger[level](`test ${level}`);
      expect(console[level]).toHaveBeenCalledWith(`test ${level}`);
    });

    (["warn", "info", "debug"] as const).forEach((level) => {
      logger[level](`test ${level}`);
      expect(console[level]).not.toHaveBeenCalled();
    });
  });

  test("when LOG_LEVEL is warn, logs error and warn messages", () => {
    process.env.LOG_LEVEL = "warn";
    const logger = new Logger();

    (["error", "warn"] as const).forEach((level) => {
      logger[level](`test ${level}`);
      expect(console[level]).toHaveBeenCalledWith(`test ${level}`);
    });

    (["info", "debug"] as const).forEach((level) => {
      logger[level](`test ${level}`);
      expect(console[level]).not.toHaveBeenCalled();
    });
  });

  test("when LOG_LEVEL is info, logs error, warn, and info messages", () => {
    process.env.LOG_LEVEL = "info";
    const logger = new Logger();

    (["error", "warn", "info"] as const).forEach((level) => {
      logger[level](`test ${level}`);
      expect(console[level]).toHaveBeenCalledWith(`test ${level}`);
    });

    (["debug"] as const).forEach((level) => {
      logger[level](`test ${level}`);
      expect(console[level]).not.toHaveBeenCalled();
    });
  });

  test("when LOG_LEVEL is debug, logs all messages", () => {
    process.env.LOG_LEVEL = "debug";
    const logger = new Logger();

    (["error", "warn", "info", "debug"] as const).forEach((level) => {
      logger[level](`test ${level}`);
      expect(console[level]).toHaveBeenCalledWith(`test ${level}`);
    });
  });

  test("defaults to error level when LOG_LEVEL is not set", () => {
    delete process.env.LOG_LEVEL;
    const logger = new Logger();

    (["error"] as const).forEach((level) => {
      logger[level](`test ${level}`);
      expect(console[level]).toHaveBeenCalledWith(`test ${level}`);
    });

    (["warn", "info", "debug"] as const).forEach((level) => {
      logger[level](`test ${level}`);
      expect(console[level]).not.toHaveBeenCalled();
    });
  });
});
