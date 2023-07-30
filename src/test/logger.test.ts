import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import { Logger } from "../logger";

describe("Logger", () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    consoleLogSpy = jest
      .spyOn(console, "log")
      .mockImplementation(jest.fn<typeof console.log>());
    consoleWarnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(jest.fn<typeof console.log>());
    consoleErrorSpy = jest
      .spyOn(console, "log")
      .mockImplementation(jest.fn<typeof console.log>());
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    delete process.env.LOG_LEVEL;
  });

  const logLevels = ["debug", "info", "warn", "error"];

  logLevels.forEach((logLevel) => {
    describe(`when LOG_LEVEL is set to ${logLevel}`, () => {
      beforeEach(() => {
        process.env.LOG_LEVEL = logLevel;
      });

      test(`debug method should ${
        logLevel === "debug" ? "" : "not "
      }log messages`, () => {
        const logger = new Logger();
        logger.debug("Debug message");
        if (logLevel === "debug") {
          expect(consoleLogSpy).toHaveBeenCalledWith("[DEBUG] Debug message");
        } else {
          expect(consoleLogSpy).not.toHaveBeenCalled();
        }
      });

      test(`info method should ${
        ["debug", "info"].includes(logLevel) ? "" : "not "
      }log messages`, () => {
        const logger = new Logger();
        logger.info("Info message");
        if (["debug", "info"].includes(logLevel)) {
          expect(consoleLogSpy).toHaveBeenCalledWith("[INFO] Info message");
        } else {
          expect(consoleLogSpy).not.toHaveBeenCalled();
        }
      });

      test(`warn method should ${
        ["debug", "info", "warn"].includes(logLevel) ? "" : "not "
      }log messages`, () => {
        const logger = new Logger();
        logger.warn("Warn message");
        if (["debug", "info", "warn"].includes(logLevel)) {
          expect(consoleWarnSpy).toHaveBeenCalledWith("[WARN] Warn message");
        } else {
          expect(consoleWarnSpy).not.toHaveBeenCalled();
        }
      });

      test("error method should always log messages", () => {
        const logger = new Logger();
        logger.error("Error message");
        expect(consoleErrorSpy).toHaveBeenCalledWith("[ERROR] Error message");
      });
    });
  });

  test("should default to debug log level if LOG_LEVEL is not set", () => {
    const logger = new Logger();

    logger.debug("Debug message");
    expect(consoleLogSpy).toHaveBeenCalledWith("[DEBUG] Debug message");

    logger.info("Info message");
    expect(consoleLogSpy).toHaveBeenCalledWith("[INFO] Info message");

    logger.warn("Warn message");
    expect(consoleLogSpy).toHaveBeenCalledWith("[WARN] Warn message");

    logger.error("Error message");
    expect(consoleLogSpy).toHaveBeenCalledWith("[ERROR] Error message");
  });
});
