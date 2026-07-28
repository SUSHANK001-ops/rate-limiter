const MemoryStore = require('../store/memory-store');

class FixedWindowRateLimiter {
  constructor({ limit, windowMs, store }) {
    if (!Number.isFinite(limit) || limit <= 0) {
      throw new TypeError('limit must be a positive number');
    }
    if (!Number.isFinite(windowMs) || windowMs <= 0) {
      throw new TypeError('windowMs must be a positive number');
    }

    this.limit = limit;
    this.windowMs = windowMs;
    this.store = store || new MemoryStore(); // use provided store or default to memory
  }

  allow(key, now = Date.now()) {
    let client = this.store.get(key);

    if (!client || now - client.windowStart >= this.windowMs) {
      client = { count: 0, windowStart: now };
    }

    if (client.count >= this.limit) {
      this.store.set(key, client);
      return {
        allowed: false,
        remaining: 0,
        resetAt: client.windowStart + this.windowMs,
      };
    }

    client.count += 1;
    this.store.set(key, client);

    return {
      allowed: true,
      remaining: this.limit - client.count,
      resetAt: client.windowStart + this.windowMs,
    };
  }

  reset(key) {
    this.store.delete(key);
  }

  cleanup(now = Date.now()) {
    this.store.cleanup(this.windowMs, now);
  }
}

module.exports = FixedWindowRateLimiter;