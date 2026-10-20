/**
 * Per-User API Rate Limiting Middleware
 * Enforces maximum 15 API requests per minute per Firebase UID.
 *
 * Sliding 60-second window tracking with dynamic Retry-After calculation.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const userRateLimits = new Map<string, RateLimitRecord>();
const WINDOW_MS = 60 * 1000; // 60 seconds
const DEFAULT_MAX_REQUESTS = 15; // 15 requests per minute

/**
 * Checks if a user has exceeded their rate limit.
 * If exceeded, returns HTTP 429 Response with Retry-After header.
 * Otherwise records the request and returns null.
 */
export function checkRateLimit(
  uid: string,
  endpoint: string,
  maxRequests = DEFAULT_MAX_REQUESTS
): { allowed: boolean; response?: Response; retryAfterSeconds?: number } {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Clean old entries periodically
  let record = userRateLimits.get(uid);
  if (!record) {
    record = { timestamps: [] };
    userRateLimits.set(uid, record);
  }

  // Filter timestamps within current sliding window
  record.timestamps = record.timestamps.filter((t) => t > windowStart);

  if (record.timestamps.length >= maxRequests) {
    const oldest = record.timestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));

    console.warn(
      `🚫 [Rate Limit] User ${uid} exceeded limit on ${endpoint} (${record.timestamps.length}/${maxRequests} reqs). Retry-After: ${retryAfterSeconds}s`
    );

    const errorBody = {
      error: "RATE_LIMITED",
      message: "Too many requests. Please try again later.",
      retryAfterSeconds,
      endpoint,
    };

    const response = new Response(JSON.stringify(errorBody), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfterSeconds.toString(),
      },
    });

    return { allowed: false, response, retryAfterSeconds };
  }

  // Record this request
  record.timestamps.push(now);
  return { allowed: true };
}
