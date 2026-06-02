import "server-only";

type LogDetails = Record<string, unknown>;

export function isDebugLoggingEnabled(): boolean {
  return process.env.LOG_LEVEL?.toLowerCase() === "debug";
}

export function debugLog(scope: string, event: string, details: LogDetails = {}) {
  if (!isDebugLoggingEnabled()) return;
  console.info(`[${scope}] ${event}`, details);
}

export function startServerTimer(event: string, details: LogDetails = {}) {
  if (!isDebugLoggingEnabled()) {
    return () => {};
  }

  const start = performance.now();
  return (extra: LogDetails = {}) => {
    console.info("[PERF]", {
      event,
      ...details,
      ...extra,
      duration_ms: Math.round(performance.now() - start),
    });
  };
}

export async function measureServer<T>(
  event: string,
  operation: () => T | PromiseLike<T>,
  details: LogDetails = {}
): Promise<T> {
  if (!isDebugLoggingEnabled()) {
    return await operation();
  }

  const stop = startServerTimer(event, details);
  try {
    return await operation();
  } finally {
    stop();
  }
}
