

const SlidingWindowRateLimiter = require('../algorithms/sliding-window');

describe('SlidingWindowRateLimiter', () => {

  test('allows requests under the limit', () => {
    const limiter = new SlidingWindowRateLimiter({ limit: 5, windowMs: 10000 });
    const result = limiter.allow('user1', 0);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  test('blocks when exactly at the limit', () => {
    const limiter = new SlidingWindowRateLimiter({ limit: 3, windowMs: 10000 });
    limiter.allow('user1', 0);
    limiter.allow('user1', 0);
    limiter.allow('user1', 0);

    // 4th request — at limit
    const result = limiter.allow('user1', 0);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  test('blocks one over the limit', () => {
    const limiter = new SlidingWindowRateLimiter({ limit: 3, windowMs: 10000 });
    limiter.allow('user1', 0);
    limiter.allow('user1', 0);
    limiter.allow('user1', 0);
    limiter.allow('user1', 0); // blocked
    
    const result = limiter.allow('user1', 0); // still blocked
    expect(result.allowed).toBe(false);
  });

  test('resets after full window expires', () => {
    const limiter = new SlidingWindowRateLimiter({ limit: 3, windowMs: 10000 });
    limiter.allow('user1', 0);
    limiter.allow('user1', 0);
    limiter.allow('user1', 0);

    // jump 2 full windows ahead — previous data irrelevant now
    const result = limiter.allow('user1', 20001);
    expect(result.allowed).toBe(true);
  });

  test('sliding weight reduces previous window impact over time', () => {
    const limiter = new SlidingWindowRateLimiter({ limit: 10, windowMs: 10000 });

    // fill previous window completely
    for (let i = 0; i < 10; i++) limiter.allow('user1', 0);

    // move 90% through the next window — previous counts only 10%
    // estimatedCount = 10 * 0.10 = 1 → should be allowed
    const result = limiter.allow('user1', 19000);
    expect(result.allowed).toBe(true);
  });

  test('different clients are independent', () => {
    const limiter = new SlidingWindowRateLimiter({ limit: 2, windowMs: 10000 });
    limiter.allow('user1', 0);
    limiter.allow('user1', 0);
    limiter.allow('user1', 0); // user1 blocked

    const result = limiter.allow('user2', 0); // user2 unaffected
    expect(result.allowed).toBe(true);
  });

});