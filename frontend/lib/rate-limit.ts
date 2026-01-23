import { NextRequest } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const RATE_LIMIT = 5; // requests
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

// In-memory store for rate limiting (resets on server restart)
const requestCounts = new Map<string, RateLimitRecord>();

/**
 * Extracts the client IP address from a Next.js request
 */
function getRateLimitKey(request: NextRequest): string {
  // Try request.ip first (available in some Next.js contexts)
  if (request.ip) {
    return request.ip;
  }

  // Fall back to x-forwarded-for header (Vercel provides this)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  // Fallback if IP cannot be determined
  return 'unknown';
}

/**
 * Checks if the request should be rate limited
 * Returns an object with success status and rate limit information
 */
export function checkRateLimit(
  request: NextRequest
): {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
} {
  const key = getRateLimitKey(request);
  const now = Date.now();
  const record = requestCounts.get(key);

  // If no record exists or window has expired, create/reset
  if (!record || now > record.resetTime) {
    const resetTime = now + WINDOW_MS;
    requestCounts.set(key, { count: 1, resetTime });
    return {
      success: true,
      limit: RATE_LIMIT,
      remaining: RATE_LIMIT - 1,
      reset: resetTime,
    };
  }

  // Check if limit exceeded
  if (record.count >= RATE_LIMIT) {
    return {
      success: false,
      limit: RATE_LIMIT,
      remaining: 0,
      reset: record.resetTime,
    };
  }

  // Increment count
  record.count++;
  return {
    success: true,
    limit: RATE_LIMIT,
    remaining: RATE_LIMIT - record.count,
    reset: record.resetTime,
  };
}
