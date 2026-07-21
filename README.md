# Distributed Rate Limiter

A production-style rate limiting service supporting four algorithms, per-API-key tiered limits, distributed state via Redis, and a live monitoring dashboard — built to explore how real-world API rate limiting (Stripe, GitHub, Twitter-style) actually works under the hood.

# Live Demo

Every rate-limiting decision is made atomically inside Redis via Lua scripts, ensuring correctness even when multiple app instances are checking/updating the same key concurrently.

# Architecture
    ┌─────────────────┐
                │   Client apps   │
                └────────┬────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
  ┌───────▼──────┐ ┌────▼───────┐ ┌────▼───────┐
  │   App        │ │   App      │ │   App      │  (multiple instances,
  │  Instance 1   │ │ Instance 2 │ │ Instance 3 │   proven distributed)
  └───────┬──────┘ └────┬───────┘ └────┬───────┘
          │              │              │
          └──────────────┼──────────────┘
                         │
                ┌────────▼────────┐
                │      Redis      │  (shared state,
                │  atomic Lua ops │   single source of truth)
                └─────────────────┘

## Algorithms Implemented

| Algorithm | Route | Tradeoff |
|---|---|---|
| **Fixed Window** | `/api/hello` | Simple, cheap, but allows bursts at window boundaries |
| **Token Bucket** | `/api/bucket-test` | Allows controlled bursts, smooths average rate over time |
| **Sliding Window Log** | `/api/swlog-test` | Exact accuracy, higher memory cost (stores every request timestamp) |
| **Leaky Bucket** | `/api/leaky-test` | Enforces a strictly steady output rate, smooths bursts into a queue |

Each algorithm is implemented as its own Redis Lua script + Express middleware, selectable per route — mirroring how real systems apply different strategies to different endpoints (e.g., stricter limits on login endpoints, more lenient burst-tolerant limits on general API reads).

## Per-API-Key Tiered Limits

Different API keys get different limits, simulating free vs. paid tiers:

```js
'free-key-123': { limit: 5, window: 60 }
'pro-key-456':  { limit: 50, window: 60 }
```

Pass a key via header: `x-api-key: pro-key-456`

## Live Dashboard

A real-time dashboard at `/dashboard.html` shows allowed/blocked counts per algorithm, refreshing every 2 seconds — useful for visually demonstrating rate limiting behavior during a demo.

## Load Test Results

Tested with [k6](https://k6.io/):

**Normal load** (50 virtual users, unique API key each, 30s):
- 468 requests/sec sustained
- p95 latency: 13.87ms
- 100% of requests received a correct response (allowed or properly rate-limited)

**Concentrated load** (10 virtual users sharing one API key, 15s):
- 99.64% of requests correctly blocked once the shared limit was reached
- Confirms accurate enforcement even under heavy contention on a single key

## Response Headers

Every rate-limited endpoint returns standard headers on all responses:
- `X-RateLimit-Limit` — max requests allowed in the current window
- `X-RateLimit-Remaining` — requests remaining before being blocked
- `Retry-After` — seconds until retry is allowed (only present on 429 responses)

This follows the same convention used by production APIs like GitHub and Stripe.

## Key Engineering Challenges & Solutions

**1. Race condition in naive Redis usage**
Initial implementation used separate `INCR` and `EXPIRE` calls, and separate read-then-write logic for token/leaky bucket. Under concurrent requests, two instances could both read a stale value before either wrote back, briefly allowing more requests than the limit. Fixed by moving all check-and-update logic into atomic Redis Lua scripts (`EVAL`), guaranteeing each decision is a single, indivisible operation.

**2. Distributed state across multiple instances**
An in-memory counter works for a single process but breaks the moment you run multiple instances behind a load balancer — each instance tracks its own count. Solved by moving all state to Redis as the single shared source of truth, verified by running two Node processes on different ports and confirming limits were enforced identically across both.

**3. Fixed window vs. sliding window naming**
Initially mislabeled a fixed-window counter as "sliding window" — a good reminder that algorithm names carry precise meaning, and mismatched naming would fall apart under interview scrutiny. Corrected by implementing a true sliding window log (Redis sorted sets) alongside the original fixed window.

## Tech Stack
- Node.js + Express
- Redis (state) + Lua (atomic operations)
- Docker + Docker Compose
- k6 (load testing)

## Running Locally

```bash
git clone https://github.com/YOUR_USERNAME/rate-limiter.git
cd rate-limiter
docker-compose up --build
```

Then visit:
- API: `http://localhost:3000/api/hello`
- Dashboard: `http://localhost:3000/dashboard.html`

## Running Load Tests

```bash
k6 run loadtest/basic-test.js
k6 run loadtest/single-key-test.js
```

## Future Improvements
- Rate limit response headers (`X-RateLimit-Remaining`, `Retry-After`)
- Horizontal scaling demo with nginx load balancer across 3+ instances
- Config-driven tiers (JSON/YAML instead of hardcoded)
- Unit test coverage for core limiting logic