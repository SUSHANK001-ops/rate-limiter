
const express    = require('express');
const Redis      = require('ioredis');
const RedisStore = require('./store/redis-store');
const MemoryStore = require('./store/memory-store');
const SlidingWindowRateLimiter = require('./algorithms/sliding-window');

const app = express();

// swap between redis and memory with one line
const useRedis = process.env.USE_REDIS === 'true';

const store = useRedis
  ? new RedisStore({ client: new Redis({ host: 'localhost', port: 6379 }) })
  : new MemoryStore();

const limiter = new SlidingWindowRateLimiter({
  limit:    10,
  windowMs: 60000,
  store,
});

async function rateLimiterMiddleware(req, res, next) {
  try {
    const key    = req.ip;
    const result = await limiter.allow(key);

    res.setHeader('X-RateLimit-Limit',     limiter.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset',     result.resetAt);

    if (!result.allowed) {
      return res.status(429).json({
        error:      'Too many requests',
        retryAfter: result.resetAt,
      });
    }

    next();
  } catch (err) {
    // Redis is down — decide: fail open or fail closed
    // fail open  = let request through (availability > security)
    // fail closed = block request (security > availability)
    console.error('Rate limiter error:', err);
    next(); // fail open — change this to res.status(500) for fail closed
  }
}

app.use(rateLimiterMiddleware);

app.get('/', (req, res) => res.send('ok'));

app.listen(3000);