const Redis = require('ioredis');

// THE LUA SCRIPT
// Everything inside runs atomically — Redis executes it as one operation
// No other command can run between these lines
const SLIDING_WINDOW_SCRIPT = `
  local currentKey  = KEYS[1]   -- current window key  e.g "rl:user1:current"
  local previousKey = KEYS[2]   -- previous window key  e.g "rl:user1:previous"

  local now         = tonumber(ARGV[1])  -- current timestamp in ms
  local windowMs    = tonumber(ARGV[2])  -- window size in ms
  local limit       = tonumber(ARGV[3])  -- max requests allowed
  local windowSec   = math.ceil(windowMs / 1000)  -- TTL in seconds

  -- get current counts from Redis (or 0 if key doesn't exist)
  local currentCount  = tonumber(redis.call('GET', currentKey)  or 0)
  local previousCount = tonumber(redis.call('GET', previousKey) or 0)

  -- THE MATH (same as your in-memory sliding window)
  -- how far into current window are we?
  local currentTTL = tonumber(redis.call('PTTL', currentKey))  -- ms remaining

  local elapsedInCurrent
  if currentTTL == -1 or currentTTL == -2 then
    -- key doesn't exist or has no TTL
    elapsedInCurrent = 0
  else
    elapsedInCurrent = windowMs - currentTTL
  end

  local weight = 1 - (elapsedInCurrent / windowMs)
  local estimatedCount = (previousCount * weight) + currentCount

  -- DENY if over limit
  if estimatedCount >= limit then
    return {
      0,                            -- allowed: 0 = false
      0,                            -- remaining
      currentCount,
      previousCount,
    }
  end

  -- ALLOW — increment current window counter
  redis.call('INCR', currentKey)

  -- set TTL only if this is a fresh key (INCR just created it)
  if currentCount == 0 then
    -- current window lives for 2x windowMs
    -- so previous window data survives the slide
    redis.call('PEXPIRE', currentKey, windowMs * 2)
  end

  local remaining = math.floor(limit - estimatedCount - 1)
  if remaining < 0 then remaining = 0 end

  return {
    1,          -- allowed: 1 = true
    remaining,
    currentCount + 1,
    previousCount,
  }
`;

class RedisStore {
  constructor({ client, keyPrefix = 'rl:' }) {
    if (!client) {
      throw new Error('Redis client is required');
    }

    this.client = client;
    this.keyPrefix = keyPrefix;

    // register the script with Redis — gets a SHA hash back
    // faster than sending the full script every request
    this.scriptSha = null;
    this._loadScript();
  }

  async _loadScript() {
    // SCRIPT LOAD stores the Lua script in Redis
    // returns a SHA1 hash — use EVALSHA instead of EVAL for speed
    this.scriptSha = await this.client.script('LOAD', SLIDING_WINDOW_SCRIPT);
  }

  _currentKey(key) {
    return `${this.keyPrefix}${key}:current`;
  }

  _previousKey(key) {
    return `${this.keyPrefix}${key}:previous`;
  }

  async allow(key, windowMs, limit, now = Date.now()) {
    const currentKey  = this._currentKey(key);
    const previousKey = this._previousKey(key);

    try {
      // EVALSHA runs the pre-loaded script by its SHA hash
      // KEYS and ARGV are how you pass arguments into Lua
      const result = await this.client.evalsha(
        this.scriptSha,
        2,                // number of KEYS
        currentKey,       // KEYS[1]
        previousKey,      // KEYS[2]
        now,              // ARGV[1]
        windowMs,         // ARGV[2]
        limit             // ARGV[3]
      );

      return {
        allowed:   result[0] === 1,
        remaining: result[1],
        resetAt:   now + windowMs,
      };

    } catch (err) {
      // script was flushed from Redis (e.g. Redis restart)
      // reload and retry once
      if (err.message.includes('NOSCRIPT')) {
        await this._loadScript();
        return this.allow(key, windowMs, limit, now);
      }
      throw err;
    }
  }

  async delete(key) {
    await this.client.del(this._currentKey(key), this._previousKey(key));
  }

  async cleanup() {
    // Redis TTL handles this automatically — nothing to do
    return;
  }
}

module.exports = RedisStore;