enum LogLevel {
  debug = 3,
  info = 2,
  warn = 1,
  error = 0,
}

function isLogLevelKey(value: string): value is keyof typeof LogLevel {
  return Object.keys(LogLevel).includes(value);
}

export class Logger {
  private logLevel: LogLevel;

  constructor() {
    const logLevelEnv = process.env.LOG_LEVEL;
    this.logLevel =
      logLevelEnv && isLogLevelKey(logLevelEnv)
        ? LogLevel[logLevelEnv]
        : LogLevel.debug;
  }

  debug(message: string): void {
    if (this.logLevel <= LogLevel.debug) {
      console.log(`[DEBUG] ${message}`);
    }
  }

  info(message: string): void {
    if (this.logLevel <= LogLevel.info) {
      console.log(`[INFO] ${message}`);
    }
  }

  warn(message: string): void {
    if (this.logLevel <= LogLevel.warn) {
      console.warn(`[WARN] ${message}`);
    }
  }

  error(message: string): void {
    if (this.logLevel <= LogLevel.error) {
      console.error(`[ERROR] ${message}`);
    }
  }
}
