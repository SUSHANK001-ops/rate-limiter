class FixedWindowRateLimiter {
  constructor({ limit, windowMs }) {
    if (!Number.isFinite(limit) || limit <= 0) {
      throw new TypeError('limit must be a positive number');
    }

    if (!Number.isFinite(windowMs) || windowMs <= 0) {
      throw new TypeError('windowMs must be a positive number');
    }

    this.limit = limit;
    this.windowMs = windowMs;
    this.clients = new Map(); // one record per client
  }

  allow(key, now = Date.now()) {
    let client = this.clients.get(key);

    // if client is new OR their window has expired, reset them
    if (!client || now - client.windowStart >= this.windowMs) {
      client = { count: 0, windowStart: now };
    }

    if (client.count >= this.limit) {
      this.clients.set(key, client);
      return {
        allowed: false,
        remaining: 0,
        resetAt: client.windowStart + this.windowMs,
      };
    }

    client.count += 1;
    this.clients.set(key, client);

    return {
      allowed: true,
      remaining: this.limit - client.count,
      resetAt: client.windowStart + this.windowMs,
    };
  }

  reset(key) {
    this.clients.delete(key); // reset one specific client
  }

  // call this periodically to prevent memory leak
  cleanup(now = Date.now()) {
    for (const [key, client] of this.clients) {
      if (now - client.windowStart >= this.windowMs) {
        this.clients.delete(key);
      }
    }
  }
}

module.exports = FixedWindowRateLimiter;