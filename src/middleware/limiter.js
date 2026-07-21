const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');

const redis = new Redis();
const script = fs.readFileSync(path.join(__dirname, '../scripts/sliding_window.lua'), 'utf8');

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

    const allowed = await redis.eval(script, 1, key, tier.limit, tier.window);

    if (allowed === 0) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    next();
  };
}

module.exports = fixedWindowLimiter;