

const MemoryStore = require('../store/redis-store');

class SlidingWindowRateLimiter {
  constructor({ limit, windowMs, store }) {
    if (!Number.isFinite(limit) || limit <= 0) {
      throw new TypeError('limit must be a positive number');
    }
    if (!Number.isFinite(windowMs) || windowMs <= 0) {
      throw new TypeError('windowMs must be a positive number');
    }

    this.limit = limit;
    this.windowMs = windowMs;
    this.store = store || new RedisStore();
  }


allow(key, now = Date.now()) {
  // Redis store handles everything including the math
  // Memory store still uses the in-memory logic
  if (this.store instanceof RedisStore) {
    return this.store.allow(key, this.windowMs, this.limit, now);
  }

    const elapsed = now - client.windowStart;

    // they've gone past TWO full windows — previous data is irrelevant
    if (elapsed >= this.windowMs * 2) {
      client = {
        currentCount: 1,
        previousCount: 0,
        windowStart: now,
      };
      this.store.set(key, client);

      return {
        allowed: true,
        remaining: this.limit - 1,
        resetAt: now + this.windowMs,
      };
    }

    // they've moved into a new window — shift current to previous
    if (elapsed >= this.windowMs) {
      client = {
        previousCount: client.currentCount,
        currentCount: 0,
        windowStart: client.windowStart + this.windowMs,
      };
    }

    // THE MATH — weighted estimate of requests in the last full window
    const elapsedInCurrent = now - client.windowStart;
    const weight = 1 - elapsedInCurrent / this.windowMs;
    const estimatedCount = client.previousCount * weight + client.currentCount;

    if (estimatedCount >= this.limit) {
      this.store.set(key, client);
      return {
        allowed: false,
        remaining: 0,
        resetAt: client.windowStart + this.windowMs,
      };
    }

    // allow the request
    client.currentCount += 1;
    this.store.set(key, client);

    const remaining = Math.floor(this.limit - estimatedCount - 1);

    return {
      allowed: true,
      remaining: Math.max(0, remaining),
      resetAt: client.windowStart + this.windowMs,
    };
  }

  reset(key) {
    this.store.delete(key);
  }

  cleanup(now = Date.now()) {
    this.store.cleanup(this.windowMs * 2, now);
  }
}

module.exports = SlidingWindowRateLimiter;