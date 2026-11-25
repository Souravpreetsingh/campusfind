import { getClientIp } from '@/lib/client-ip';

type RateLimitEntry = { count: number; resetAt: number };
type RateLimitBucket = Map<string, RateLimitEntry>;

interface RateLimitState {
  buckets: Map<string, RateLimitBucket>;
}

const globalState = globalThis as unknown as { __campusfindRateLimit?: RateLimitState };

const state: RateLimitState =
  globalState.__campusfindRateLimit ??
  (globalState.__campusfindRateLimit = { buckets: new Map() });

export class RateLimitError extends Error {
  readonly bucket: string;
  readonly retryAfter: number;

  constructor(bucket: string, retryAfter: number) {
    super('Too many requests. Please try again shortly.');
    this.name = 'RateLimitError';
    this.bucket = bucket;
    this.retryAfter = retryAfter;
  }
}

/** Returns the number of remaining requests in the current window. */
export function enforceRateLimit(
  request: Request,
  bucket: string,
  limit: number,
  windowMs: number,
): number {
  const ip = getClientIp(request);
  const key = `${bucket}:${ip}`;
  const now = Date.now();

  let bucketEntries = state.buckets.get(bucket);
  if (!bucketEntries) {
    bucketEntries = new Map();
    state.buckets.set(bucket, bucketEntries);
  }

  const current = bucketEntries.get(key);
  if (!current || current.resetAt <= now) {
    bucketEntries.set(key, { count: 1, resetAt: now + windowMs });
    return Math.max(0, limit - 1);
  }

  if (current.count >= limit) {
    throw new RateLimitError(bucket, Math.max(1, Math.ceil((current.resetAt - now) / 1000)));
  }

  current.count += 1;
  return Math.max(0, limit - current.count);
}
