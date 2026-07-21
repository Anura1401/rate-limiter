const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');
const {recordStat,recordRemaining} = require('./stats');
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
});
const script = fs.readFileSync(path.join(__dirname, '../scripts/token_bucket.lua'), 'utf8');

const TIER_LIMITS = {
  'free-key-123': { capacity: 5, refillRate: 0.1 },  
  'pro-key-456': { capacity: 50, refillRate: 1 },     
};

function tokenBucketLimiter(defaultCapacity, defaultRefillRate) {
  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const identifier = apiKey || req.ip;
    const key = `bucket:${identifier}`;
    const now = Math.floor(Date.now() / 1000);

    const tier = TIER_LIMITS[apiKey] || { capacity: defaultCapacity, refillRate: defaultRefillRate };

    const [allowed, remaining, retryAfter] = await redis.eval(script, 1, key, tier.capacity, tier.refillRate, now);
    await recordStat('tokenBucket', allowed === 1);
    await recordRemaining('tokenBucket', remaining, tier.limit);

    res.set('X-RateLimit-Limit', tier.capacity);
    res.set('X-RateLimit-Remaining', remaining);

    if (allowed === 0) {
      res.set('Retry-After', retryAfter);
      return res.status(429).json({ error: 'Too many requests' });
    }

    next();
  };
}

module.exports = tokenBucketLimiter;