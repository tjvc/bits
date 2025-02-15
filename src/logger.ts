export type LogLevel = "error" | "warn" | "info" | "debug";
type LogMessage = [message: string, ...args: (string | number | object)[]];

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export class Logger {
  private level: LogLevel;

  constructor() {
    this.level = (process.env.LOG_LEVEL as LogLevel) || "error";
  }

  error(...args: LogMessage): void {
    console.error(...args);
  }

  warn(...args: LogMessage): void {
    if (this.shouldLog("warn")) {
      console.warn(...args);
    }
  }

  info(...args: LogMessage): void {
    if (this.shouldLog("info")) {
      console.info(...args);
    }
  }

  debug(...args: LogMessage): void {
    if (this.shouldLog("debug")) {
      console.debug(...args);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
  }
}

export const logger = new Logger();
