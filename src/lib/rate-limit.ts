import { RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS } from "./ai-config";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const requestsByClient = new Map<string, RateLimitEntry>();

export function checkRateLimit(clientId: string) {
  const now = Date.now();
  const existing = requestsByClient.get(clientId);

  if (!existing || existing.resetAt <= now) {
    requestsByClient.set(clientId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });

    return {
      allowed: true,
      remaining: RATE_LIMIT_REQUESTS - 1,
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= RATE_LIMIT_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1_000),
      ),
    };
  }

  existing.count += 1;

  if (requestsByClient.size > 1_000) {
    for (const [key, entry] of requestsByClient) {
      if (entry.resetAt <= now) requestsByClient.delete(key);
    }
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT_REQUESTS - existing.count,
    retryAfterSeconds: 0,
  };
}
