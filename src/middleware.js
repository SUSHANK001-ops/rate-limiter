const express = require('express');
const FixedWindowRateLimiter = require('./algorithms/fixed-window.js');

const app = express();
const port = process.env.PORT || 3000;

const limiter = new FixedWindowRateLimiter({ limit: 10, windowMs: 60000 });

function rateLimiterMiddleware(req, res, next) {
  const key = req.ip;
  const result = limiter.allow(key);

  res.setHeader('X-RateLimit-Limit', 10);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', result.resetAt);

  if (!result.allowed) {
    return res.status(429).json({ message: 'Too many requests' });
  }

  next();
}

app.use(rateLimiterMiddleware);

app.get('/', (req, res) => {
  res.send('Express server is running');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});