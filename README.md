# Rate Limiter

Small Express app that demonstrates a fixed-window rate limiter backed by an in-memory store.

## What it does

- Limits each client by IP address.
- Uses a fixed window algorithm with a default limit of 10 requests per 60 seconds.
- Returns `429 Too Many Requests` when the limit is exceeded.
- Sends rate-limit headers on every response:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Project Structure

- `src/middleware.js` - Express app and middleware wiring.
- `src/algorithms/fixed-window.js` - Fixed window limiter implementation.
- `src/store/memory-store.js` - Simple in-memory store used by the limiter.

## Requirements

- Node.js
- npm

## Install

```bash
npm install
```

## Run

```bash
npm start
```

The server starts on port `3000` by default. Set `PORT` to change it.

## Example

```bash
curl http://localhost:3000/
```

Successful requests return:

```text
Express server is running
```

When the limit is exceeded, the app responds with:

```json
{
  "message": "Too many requests"
}
```

## Notes

- The limiter currently uses `req.ip` as the client key.
- The in-memory store resets when the process restarts.
- You can replace the store implementation later if you want shared state across processes.