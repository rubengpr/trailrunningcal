import { NextRequest } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const RATE_LIMIT = 5; // requests
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

// In-memory store: resets on server restart
const requestCounts = new Map<string, RateLimitRecord>();

function getRateLimitKey(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs; take the last one (appended by the trusted Vercel proxy)
    const ips = forwardedFor.split(',');
    return ips[ips.length - 1].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return 'unknown';
}

function applyRateLimit(key: string): {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
} {
  const now = Date.now();
  const record = requestCounts.get(key);

  if (!record || now > record.resetTime) {
    const resetTime = now + WINDOW_MS;
    requestCounts.set(key, { count: 1, resetTime });
    return { success: true, limit: RATE_LIMIT, remaining: RATE_LIMIT - 1, reset: resetTime };
  }

  if (record.count >= RATE_LIMIT) {
    return { success: false, limit: RATE_LIMIT, remaining: 0, reset: record.resetTime };
  }

  record.count++;
  return { success: true, limit: RATE_LIMIT, remaining: RATE_LIMIT - record.count, reset: record.resetTime };
}

export function checkRateLimitByIp(ip: string): { success: boolean; limit: number; remaining: number; reset: number } {
  return applyRateLimit(ip);
}

export function checkRateLimit(
  request: NextRequest
): {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
} {
  return applyRateLimit(getRateLimitKey(request));
}
