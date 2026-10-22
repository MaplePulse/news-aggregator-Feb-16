/**
 * Best-effort in-memory rate limiter for API routes.
 * On Vercel each serverless instance has its own memory, so this slows
 * abuse down rather than guaranteeing a hard cap. Real protection comes
 * from the route itself (e.g. long restore codes, backend item caps).
 */
const buckets = new Map<string, number[]>();

export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  const first = xff?.split(",")[0]?.trim();
  if (first) return first;
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Returns true if this key is over `limit` hits within `windowS` seconds. */
export function isRateLimited(key: string, limit: number, windowS: number): boolean {
  const now = Date.now();
  const cutoff = now - windowS * 1000;
  const fresh = (buckets.get(key) || []).filter((t) => t >= cutoff);
  if (fresh.length >= limit) {
    buckets.set(key, fresh);
    return true;
  }
  fresh.push(now);
  buckets.set(key, fresh);

  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (!v.length || v[v.length - 1] < cutoff) buckets.delete(k);
    }
  }
  return false;
}
