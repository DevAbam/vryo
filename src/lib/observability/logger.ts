type Level = "debug" | "info" | "warn" | "error";

const SENSITIVE_KEY =
  /(authorization|cookie|password|secret|token|api[-_]?key|service[-_]?role|body)/i;
const MAX_DEPTH = 5;

/** Replaces values under sensitive keys so credentials and private content never reach logs. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[truncated]";
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) {
      out[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : redact(inner, depth + 1);
    }
    return out;
  }
  return value;
}

function write(level: Level, message: string, context: Record<string, unknown> = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    environment: process.env.NODE_ENV,
    message,
    ...(redact(context) as Record<string, unknown>),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** Structured JSON logger. Pass identifiers, never raw request bodies or tokens. */
export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") write("debug", message, context);
  },
  info: (message: string, context?: Record<string, unknown>) => write("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => write("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => write("error", message, context),
};
