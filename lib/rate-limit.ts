/**
 * Minimal in-memory sliding-window rate limiter to protect OpenAI spend.
 *
 * This is intentionally dependency-free so it works out of the box, but it
 * is per-process: on serverless platforms with multiple instances (or after
 * a redeploy) each instance keeps its own counters, so the effective limit
 * is "N requests per instance" rather than a hard global cap. For a strict
 * global limit in production, swap the Map below for a shared store such
 * as Upstash Redis (`@upstash/ratelimit`) — the function signature here is
 * designed to make that a drop-in change.
 */

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 12; // ~1 question every 5s sustained

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
};

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetInMs: WINDOW_MS };
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: WINDOW_MS - (now - existing.windowStart),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - existing.count,
    resetInMs: WINDOW_MS - (now - existing.windowStart),
  };
}

// Periodic cleanup so the Map doesn't grow unbounded across many users.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart >= WINDOW_MS) buckets.delete(key);
  }
}, WINDOW_MS).unref?.();
