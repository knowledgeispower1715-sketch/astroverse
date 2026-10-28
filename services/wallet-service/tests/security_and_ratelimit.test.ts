/**
 * ASTROVERSE SECURITY & RATE LIMITING UNIT & INTEGRATION TEST SUITE
 */

import { createRateLimiter } from '../src/security/rateLimiter';
import { Request, Response } from 'express';

console.log('===============================================================');
console.log('ASTROVERSE SECURITY & RATE LIMITING TEST SUITE');
console.log('===============================================================');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

async function runRateLimiterTests() {
  console.log('\n--- 1. SLIDING WINDOW RATE LIMITER LOGIC ---');

  const limiter = createRateLimiter({
    windowMs: 1000,
    max: 3,
    message: 'Test rate limit exceeded.',
    skip: () => false // Force execution in test environment
  });

  const mockReq = {
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
    ip: '127.0.0.1'
  } as unknown as Request;

  const capturedHeaders: Record<string, any> = {};
  let statusCode = 200;
  let responseBody: any = null;

  function createMockRes(): Response {
    return {
      setHeader(name: string, val: any) {
        capturedHeaders[name.toLowerCase()] = val;
      },
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: any) {
        responseBody = body;
        return this;
      }
    } as unknown as Response;
  }

  // Request 1: Should pass
  let nextCalled: any = false;
  limiter(mockReq, createMockRes(), () => { nextCalled = true; });
  assert(nextCalled === true, 'Request 1/3 passes through limiter');
  assert(capturedHeaders['ratelimit-remaining'] === 2, 'RateLimit-Remaining is 2');
  assert(capturedHeaders['ratelimit-limit'] === 3, 'RateLimit-Limit header is 3');

  // Request 2: Should pass
  nextCalled = false;
  limiter(mockReq, createMockRes(), () => { nextCalled = true; });
  assert(nextCalled === true, 'Request 2/3 passes through limiter');
  assert(capturedHeaders['ratelimit-remaining'] === 1, 'RateLimit-Remaining is 1');

  // Request 3: Should pass
  nextCalled = false;
  limiter(mockReq, createMockRes(), () => { nextCalled = true; });
  assert(nextCalled === true, 'Request 3/3 passes through limiter');
  assert(capturedHeaders['ratelimit-remaining'] === 0, 'RateLimit-Remaining is 0');

  // Request 4: Blocked with HTTP 429
  nextCalled = false;
  statusCode = 200;
  limiter(mockReq, createMockRes(), () => { nextCalled = true; });
  assert(nextCalled === false, 'Request 4/3 is BLOCKED by limiter');
  assert(statusCode === 429, 'Blocked request returns HTTP 429');
  assert(responseBody?.error === 'RATE_LIMIT_EXCEEDED', 'Error code is RATE_LIMIT_EXCEEDED');
  assert(typeof capturedHeaders['retry-after'] === 'number' && capturedHeaders['retry-after'] >= 1, 'Retry-After header provides positive cooldown seconds');

  // Independent IP test
  const otherIpReq = {
    headers: { 'x-forwarded-for': '10.0.0.5' },
    socket: { remoteAddress: '127.0.0.1' },
    ip: '10.0.0.5'
  } as unknown as Request;

  nextCalled = false;
  limiter(otherIpReq, createMockRes(), () => { nextCalled = true; });
  assert(nextCalled === true, 'Different IP (10.0.0.5) is evaluated in separate bucket and passes');
  assert(capturedHeaders['ratelimit-remaining'] === 2, 'Different IP has full quota remaining (2)');

  // Sliding window expiry
  console.log('\n--- 2. SLIDING WINDOW EXPIRY ---');
  await new Promise(resolve => setTimeout(resolve, 1100)); // Wait > 1000ms window

  nextCalled = false;
  limiter(mockReq, createMockRes(), () => { nextCalled = true; });
  assert(nextCalled === true, 'After windowMs elapsed, original IP is unblocked and passes');
  assert(capturedHeaders['ratelimit-remaining'] === 2, 'Quota resets after window elapsed');

  console.log('\n===============================================================');
  console.log(`SECURITY & RATE LIMITING SUITE FINISHED: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('===============================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runRateLimiterTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
