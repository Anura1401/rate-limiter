const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
});
const fs = require('fs');
const path = require('path');
const { recordStat } = require('./stats');

const script = fs.readFileSync(path.join(__dirname, '../scripts/fixed_window.lua'), 'utf8');

const TIER_LIMITS = {
  'free-key-123': { limit: 5, window: 60 },
  'pro-key-456': { limit: 50, window: 60 },
};

function fixedWindowLimiter(defaultLimit, defaultWindow) {
  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const identifier = apiKey || req.ip;
    const key = `rate:${identifier}`;

    const tier = TIER_LIMITS[apiKey] || { limit: defaultLimit, window: defaultWindow };

    const [allowed, remaining, ttl] = await redis.eval(script, 1, key, tier.limit, tier.window);

    await recordStat('fixedWindow', allowed === 1);

    res.set('X-RateLimit-Limit', tier.limit);
    res.set('X-RateLimit-Remaining', remaining);

    if (allowed === 0) {
      res.set('Retry-After', ttl);
      return res.status(429).json({ error: 'Too many requests' });
    }

    next();
  };
}

module.exports = fixedWindowLimiter;