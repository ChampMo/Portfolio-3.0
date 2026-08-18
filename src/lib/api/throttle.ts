/**
 * In-memory rate limiting for the unauthenticated endpoints.
 *
 * Deliberately modest: it resets on deploy and is per-instance, so it stops
 * casual abuse from one machine and nothing more. Anything running behind
 * several instances, or exposed to a determined attacker, needs a shared
 * limiter (Redis / Upstash) or the platform's own WAF in front. The comment
 * matters more than the code here — this must not be mistaken for real
 * protection.
 */
const buckets = new Map<string, number[]>();

/** Records a hit and reports whether the caller has now exceeded `max`. */
export function tooMany(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  buckets.set(key, recent);

  // Opportunistic sweep so the map cannot grow without bound.
  if (buckets.size > 2000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }

  return recent.length > max;
}

/**
 * Best-effort client address.
 *
 * `x-forwarded-for` is trivially spoofed unless a trusted proxy is the only
 * thing that can reach the app — which is the normal deployment shape, but is
 * an assumption worth stating rather than hiding.
 */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
