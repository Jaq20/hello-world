import "server-only";
import { headers } from "next/headers";

// Lightweight in-memory sliding-window rate limiter. Suitable for a single
// Node instance (the default deployment for this foundation). For multi-
// instance/serverless deployments, back this with Redis or the database — the
// call sites stay the same.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map doesn't grow unbounded.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  buckets.forEach((b, key) => {
    if (b.resetAt <= now) buckets.delete(key);
  });
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

// Best-effort client IP from common proxy headers. Falls back to a constant so
// the limiter still degrades to a global cap if no IP is available.
export function clientIp(): string {
  const h = headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

// Convenience wrapper keyed by action + client IP.
export function rateLimitByIp(
  action: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  return rateLimit(`${action}:${clientIp()}`, limit, windowMs);
}
