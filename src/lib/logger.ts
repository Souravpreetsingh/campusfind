/**
 * Structured logging helpers.
 *
 * Log output never includes request bodies, credentials, tokens, or raw error
 * objects. Error messages and stacks are only emitted outside production.
 */

type LogValue = string | number | boolean | null;

type LogMetadata = Record<string, unknown>;

const SAFE_METADATA_KEYS = new Set([
  'action',
  'bucket',
  'code',
  'context',
  'count',
  'entityId',
  'entityType',
  'reason',
  'retryAfter',
  'status',
]);

function safeMetadata(metadata?: LogMetadata): Record<string, LogValue> {
  const result: Record<string, LogValue> = {};
  if (!metadata) return result;

  for (const [key, value] of Object.entries(metadata)) {
    if (!SAFE_METADATA_KEYS.has(key)) continue;
    if (typeof value === 'string') result[key] = value.slice(0, 200);
    else if (typeof value === 'number' && Number.isFinite(value)) result[key] = value;
    else if (typeof value === 'boolean' || value === null) result[key] = value;
  }

  return result;
}

function errorDetails(error: unknown): Record<string, string> {
  if (process.env.NODE_ENV === 'production') return {};
  if (error instanceof Error) {
    return {
      error: error.message.slice(0, 500),
      ...(error.stack ? { stack: error.stack.slice(0, 2000) } : {}),
    };
  }
  return { error: 'Unknown error' };
}

function emit(level: 'error' | 'warn', message: string, metadata?: LogMetadata, error?: unknown) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...safeMetadata(metadata),
    ...(error !== undefined ? errorDetails(error) : {}),
  };

  const serialized = JSON.stringify(entry);
  if (level === 'error') console.error(serialized);
  else console.warn(serialized);
}

export function logError(message: string, error?: unknown, metadata?: LogMetadata): void {
  emit('error', message, metadata, error);
}

export function logWarn(message: string, metadata?: LogMetadata): void {
  emit('warn', message, metadata);
}
