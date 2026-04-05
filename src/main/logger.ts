type LogLevel = "debug" | "info" | "warn" | "error";

const priorities: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const envLevel = (process.env.LOG_LEVEL ?? "info").toLowerCase();
const currentLevel: LogLevel = (Object.keys(priorities) as LogLevel[]).includes(envLevel as LogLevel)
  ? (envLevel as LogLevel)
  : "info";

function shouldLog(level: LogLevel): boolean {
  return priorities[level] >= priorities[currentLevel];
}

function formatMessage(level: LogLevel, message: string): string {
  return `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
}

function write(level: LogLevel, message: string, meta?: unknown): void {
  if (!shouldLog(level)) return;
  const formatted = formatMessage(level, message);
  if (meta === undefined) {
    // eslint-disable-next-line no-console
    console.log(formatted);
    return;
  }
  // eslint-disable-next-line no-console
  console.log(formatted, meta);
}

export const logger = {
  debug: (message: string, meta?: unknown): void => write("debug", message, meta),
  info: (message: string, meta?: unknown): void => write("info", message, meta),
  warn: (message: string, meta?: unknown): void => write("warn", message, meta),
  error: (message: string, meta?: unknown): void => write("error", message, meta)
};
