type LogMeta = Record<string, unknown> | undefined;

function formatMeta(meta?: LogMeta) {
  if (!meta) return "";

  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return " [unserializable-meta]";
  }
}

function write(prefix: string, message: string, meta?: LogMeta) {
  if (!__DEV__) return;
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${prefix} ${message}${formatMeta(meta)}`);
}

export function logApp(message: string, meta?: LogMeta) {
  write("[APP]", message, meta);
}

export function logAuth(message: string, meta?: LogMeta) {
  write("[AUTH]", message, meta);
}

export function logNav(message: string, meta?: LogMeta) {
  write("[NAV]", message, meta);
}

export function logOnboarding(message: string, meta?: LogMeta) {
  write("[ONBOARDING]", message, meta);
}

export function logDuel(message: string, meta?: LogMeta) {
  write("[DUEL]", message, meta);
}

export function logTasks(message: string, meta?: LogMeta) {
  write("[TASKS]", message, meta);
}

/**
 * Unlike the info loggers above, errors are also written in release builds: console.error reaches
 * the OS log (Console.app / logcat), which is the only crash trail until a crash reporter is wired.
 */
export function logError(prefix: string, error: unknown, meta?: LogMeta) {
  const payload = {
    ...(meta ?? {}),
    error:
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { message: String(error) },
  };
  console.error(`[${new Date().toISOString()}] ${prefix} error${formatMeta(payload)}`);
}
