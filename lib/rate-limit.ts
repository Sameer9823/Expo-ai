/**
 * Per-user sliding-window rate limiter to protect OpenAI spend on
 * /api/chat.
 *
 * Production (recommended): backed by Upstash Redis via `@upstash/ratelimit`
 * so the limit is a true global cap shared across every serverless
 * instance/region/redeploy. Enabled automatically when
 * UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.
 *
 * Local/dev fallback: if those env vars are unset, falls back to the
 * original in-memory sliding window so `npm run dev` works with zero
 * extra setup. This fallback is per-process — on serverless platforms with
 * multiple instances each instance keeps its own counters, so the
 * effective limit becomes "N requests per instance" rather than a hard
 * global cap. Don't rely on it in production.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW = "60 s";
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 12; // ~1 question every 5s sustained

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
};

// ---------------------------------------------------------------------------
// Redis-backed limiter (production)
// ---------------------------------------------------------------------------

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redisLimiter =
  redisUrl && redisToken
    ? new Ratelimit({
        redis: new Redis({ url: redisUrl, token: redisToken }),
        // Sliding window matches the original semantics: MAX_REQUESTS_PER_WINDOW
        // requests per rolling 60s window, per key.
        limiter: Ratelimit.slidingWindow(MAX_REQUESTS_PER_WINDOW, WINDOW),
        analytics: true,
        prefix: "expo-search:chat",
      })
    : null;

// ---------------------------------------------------------------------------
// In-memory fallback limiter (local dev only)
// ---------------------------------------------------------------------------

type Bucket = { count: number; windowStart: number };
const buckets = new Map<string, Bucket>();

function checkInMemory(key: string): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetInMs: WINDOW_MS };
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetInMs: WINDOW_MS - (now - existing.windowStart) };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - existing.count,
    resetInMs: WINDOW_MS - (now - existing.windowStart),
  };
}

// Periodic cleanup so the Map doesn't grow unbounded across many users.
// Only relevant when the in-memory fallback is actually in use.
if (!redisLimiter) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now - bucket.windowStart >= WINDOW_MS) buckets.delete(key);
    }
  }, WINDOW_MS).unref?.();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Checks and consumes one request against the caller's rate limit bucket.
 * `key` should be a stable per-user identifier (e.g. Clerk userId).
 */
export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  if (redisLimiter) {
    const { success, remaining, reset } = await redisLimiter.limit(key);
    return { allowed: success, remaining, resetInMs: Math.max(0, reset - Date.now()) };
  }
  return checkInMemory(key);
}