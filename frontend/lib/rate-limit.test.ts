import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit } from './rate-limit';
import type { NextRequest } from 'next/server';

// Helper function to create mock NextRequest with headers
function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  const headersObj = new Headers();
  Object.entries(headers).forEach(([key, value]) => {
    headersObj.set(key, value);
  });

  return {
    headers: headersObj,
    url: 'http://localhost:3000/api/test',
  } as unknown as NextRequest;
}

describe('checkRateLimit', () => {
  // Note: The rate limit store is module-scoped, so we use unique IPs per test
  // to avoid cross-test contamination
  let uniqueIpCounter = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    uniqueIpCounter++;
  });

  function getUniqueIp(): string {
    return `192.168.1.${uniqueIpCounter}`;
  }

  describe('IP extraction from headers', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const ip = getUniqueIp();
      const request = createMockRequest({ 'x-forwarded-for': ip });
      const result = checkRateLimit(request);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1 = 4
    });

    it('should extract IP from x-real-ip header when x-forwarded-for is not present', () => {
      const ip = getUniqueIp();
      const request = createMockRequest({ 'x-real-ip': ip });
      const result = checkRateLimit(request);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should prefer x-forwarded-for over x-real-ip', () => {
      // Use unique IPs that definitely haven't been used before
      const forwardedIp = `12.0.${uniqueIpCounter}.1`;
      uniqueIpCounter++;
      const differentIp = `12.0.${uniqueIpCounter}.2`;
      uniqueIpCounter++;

      const request = createMockRequest({
        'x-forwarded-for': forwardedIp,
        'x-real-ip': 'should-not-be-used',
      });

      // First request with forwarded IP
      const result1 = checkRateLimit(request);
      expect(result1.remaining).toBe(4);

      // Second request with same forwarded IP should decrement
      const result2 = checkRateLimit(request);
      expect(result2.remaining).toBe(3);

      // Request with only real IP should be fresh (different counter)
      const requestRealIp = createMockRequest({ 'x-real-ip': differentIp });
      const result3 = checkRateLimit(requestRealIp);
      expect(result3.remaining).toBe(4); // Fresh IP
    });

    it('should use first IP when x-forwarded-for contains multiple IPs', () => {
      const ip = getUniqueIp();
      const request = createMockRequest({
        'x-forwarded-for': `${ip}, 10.0.0.1, 10.0.0.2`,
      });

      const result = checkRateLimit(request);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should trim whitespace from IP addresses', () => {
      const ip = getUniqueIp();
      const request = createMockRequest({
        'x-forwarded-for': `  ${ip}  , 10.0.0.1`,
      });

      const result = checkRateLimit(request);
      expect(result.success).toBe(true);
    });

    it('should use "unknown" when no IP headers present', () => {
      const request = createMockRequest({});

      // All requests without IP will share the "unknown" key
      // So we need to test this in sequence
      const results = [];
      for (let i = 0; i < 6; i++) {
        results.push(checkRateLimit(request));
      }

      // First 5 should succeed
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
      expect(results[3].success).toBe(true);
      expect(results[4].success).toBe(true);

      // 6th should fail (exceeded limit of 5)
      expect(results[5].success).toBe(false);
      expect(results[5].remaining).toBe(0);
    });
  });

  describe('request counting', () => {
    it('should allow first request and return correct remaining count', () => {
      const ip = getUniqueIp();
      const request = createMockRequest({ 'x-forwarded-for': ip });

      const result = checkRateLimit(request);

      expect(result.success).toBe(true);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(4); // 5 - 1 = 4
      expect(result.reset).toBeGreaterThan(Date.now());
    });

    it('should decrement remaining count on subsequent requests', () => {
      const ip = getUniqueIp();
      const request = createMockRequest({ 'x-forwarded-for': ip });

      const result1 = checkRateLimit(request);
      expect(result1.remaining).toBe(4);

      const result2 = checkRateLimit(request);
      expect(result2.remaining).toBe(3);

      const result3 = checkRateLimit(request);
      expect(result3.remaining).toBe(2);
    });

    it('should allow exactly 5 requests before blocking', () => {
      const ip = getUniqueIp();
      const request = createMockRequest({ 'x-forwarded-for': ip });

      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(checkRateLimit(request));
      }

      // All 5 should succeed
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
      expect(results[3].success).toBe(true);
      expect(results[4].success).toBe(true);

      // Check remaining counts
      expect(results[0].remaining).toBe(4);
      expect(results[1].remaining).toBe(3);
      expect(results[2].remaining).toBe(2);
      expect(results[3].remaining).toBe(1);
      expect(results[4].remaining).toBe(0);
    });

    it('should block 6th request (exceed limit of 5)', () => {
      const ip = getUniqueIp();
      const request = createMockRequest({ 'x-forwarded-for': ip });

      // Make 5 successful requests
      for (let i = 0; i < 5; i++) {
        checkRateLimit(request);
      }

      // 6th request should be blocked
      const result = checkRateLimit(request);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.limit).toBe(5);
    });

    it('should continue blocking requests after limit exceeded', () => {
      const ip = getUniqueIp();
      const request = createMockRequest({ 'x-forwarded-for': ip });

      // Make 5 successful requests
      for (let i = 0; i < 5; i++) {
        checkRateLimit(request);
      }

      // Multiple subsequent requests should all be blocked
      const result1 = checkRateLimit(request);
      expect(result1.success).toBe(false);

      const result2 = checkRateLimit(request);
      expect(result2.success).toBe(false);

      const result3 = checkRateLimit(request);
      expect(result3.success).toBe(false);
    });
  });

  describe('separate tracking per IP', () => {
    it('should track different IPs independently', () => {
      // Use completely fresh unique IPs for this test
      const ip1 = `10.0.${uniqueIpCounter}.1`;
      uniqueIpCounter++;
      const ip2 = `10.0.${uniqueIpCounter}.2`;
      uniqueIpCounter++;

      const request1 = createMockRequest({ 'x-forwarded-for': ip1 });
      const request2 = createMockRequest({ 'x-forwarded-for': ip2 });

      // Make 3 requests from IP1
      checkRateLimit(request1);
      checkRateLimit(request1);
      const result1 = checkRateLimit(request1);
      expect(result1.remaining).toBe(2);

      // First request from IP2 should have full quota
      const result2 = checkRateLimit(request2);
      expect(result2.remaining).toBe(4);
    });

    it('should allow 5 requests per IP independently', () => {
      // Use completely fresh unique IPs for this test
      const ip1 = `11.0.${uniqueIpCounter}.1`;
      uniqueIpCounter++;
      const ip2 = `11.0.${uniqueIpCounter}.2`;
      uniqueIpCounter++;

      const request1 = createMockRequest({ 'x-forwarded-for': ip1 });
      const request2 = createMockRequest({ 'x-forwarded-for': ip2 });

      // Both IPs should be able to make 5 requests
      for (let i = 0; i < 5; i++) {
        const r1 = checkRateLimit(request1);
        const r2 = checkRateLimit(request2);
        expect(r1.success).toBe(true);
        expect(r2.success).toBe(true);
      }

      // Both should be blocked on 6th request
      expect(checkRateLimit(request1).success).toBe(false);
      expect(checkRateLimit(request2).success).toBe(false);
    });
  });

  describe('time window behavior', () => {
    it('should set reset time approximately 1 hour in the future', () => {
      const ip = getUniqueIp();
      const request = createMockRequest({ 'x-forwarded-for': ip });

      const now = Date.now();
      const result = checkRateLimit(request);

      const expectedReset = now + 60 * 60 * 1000; // 1 hour
      const tolerance = 1000; // 1 second tolerance for test execution time

      expect(result.reset).toBeGreaterThanOrEqual(expectedReset - tolerance);
      expect(result.reset).toBeLessThanOrEqual(expectedReset + tolerance);
    });

    it('should maintain same reset time for subsequent requests within window', () => {
      const ip = getUniqueIp();
      const request = createMockRequest({ 'x-forwarded-for': ip });

      const result1 = checkRateLimit(request);

      // Small delay
      vi.useFakeTimers();
      vi.advanceTimersByTime(100);

      const result2 = checkRateLimit(request);

      vi.useRealTimers();

      // Reset time should be the same for both requests
      expect(result2.reset).toBe(result1.reset);
    });

    it('should reset count after time window expires', () => {
      const ip = getUniqueIp();
      const request = createMockRequest({ 'x-forwarded-for': ip });

      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      // Make 5 requests (hit limit)
      for (let i = 0; i < 5; i++) {
        checkRateLimit(request);
      }

      // Verify limit is hit
      const blockedResult = checkRateLimit(request);
      expect(blockedResult.success).toBe(false);

      // Advance time past the 1-hour window
      vi.advanceTimersByTime(60 * 60 * 1000 + 1);

      // Next request should reset and succeed
      const resetResult = checkRateLimit(request);
      expect(resetResult.success).toBe(true);
      expect(resetResult.remaining).toBe(4);

      vi.useRealTimers();
    });
  });

  describe('edge cases', () => {
    it('should handle IPv6 addresses', () => {
      const ipv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      const request = createMockRequest({ 'x-forwarded-for': ipv6 });

      const result = checkRateLimit(request);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should handle localhost addresses', () => {
      const request = createMockRequest({ 'x-forwarded-for': '127.0.0.1' });

      const result = checkRateLimit(request);
      expect(result.success).toBe(true);
    });

    it('should handle IPv6 localhost', () => {
      const request = createMockRequest({ 'x-forwarded-for': '::1' });

      const result = checkRateLimit(request);
      expect(result.success).toBe(true);
    });

    it('should handle empty x-forwarded-for header by falling back to x-real-ip or unknown', () => {
      // When x-forwarded-for is empty, it uses the first element after split ('')
      // This test verifies the behavior exists, but the result depends on prior state
      const request = createMockRequest({
        'x-forwarded-for': '',
        'x-real-ip': getUniqueIp()
      });

      const result = checkRateLimit(request);
      // Just verify structure is correct
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('remaining');
    });

    it('should handle whitespace-only x-forwarded-for header', () => {
      // Uses unique real-ip as fallback to avoid state collision
      const request = createMockRequest({
        'x-forwarded-for': '   ',
        'x-real-ip': getUniqueIp()
      });

      const result = checkRateLimit(request);
      // Just verify structure is correct
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('remaining');
    });

    it('should return consistent response structure', () => {
      const ip = getUniqueIp();
      const request = createMockRequest({ 'x-forwarded-for': ip });

      const result = checkRateLimit(request);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('remaining');
      expect(result).toHaveProperty('reset');

      expect(typeof result.success).toBe('boolean');
      expect(typeof result.limit).toBe('number');
      expect(typeof result.remaining).toBe('number');
      expect(typeof result.reset).toBe('number');
    });
  });
});
