// Simple in-memory rate limiter for API routes
// Each limiter instance has its own map and config

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterConfig {
  windowMs: number; // Time window in milliseconds
  max: number;      // Max requests per window
}

const limiters = new Map<string, Map<string, RateLimitEntry>>();

export function isRateLimited(
  namespace: string,
  key: string,
  config: RateLimiterConfig = { windowMs: 60_000, max: 3 }
): boolean {
  if (!limiters.has(namespace)) {
    limiters.set(namespace, new Map());
  }
  const map = limiters.get(namespace)!;
  const now = Date.now();
  const entry = map.get(key);

  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + config.windowMs });
    return false;
  }

  entry.count++;
  return entry.count > config.max;
}

export function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
