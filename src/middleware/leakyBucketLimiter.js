const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
});
const fs = require('fs');
const path = require('path');
const {recordStat,recordRemaining} = require('./stats')
const script = fs.readFileSync(path.join(__dirname, '../scripts/leaky_bucket.lua'), 'utf8');

function leakyBucketLimiter(capacity, leakRate) {
  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const identifier = apiKey || req.ip;
    const key = `leaky:${identifier}`;
    const now = Math.floor(Date.now() / 1000);

    const [allowed, remaining, retryAfter] = await redis.eval(script, 1, key, capacity, leakRate, now);
    await recordStat('leakyBucket', allowed === 1);
    await recordRemaining('leakyBucket', remaining, capacity);

    res.set('X-RateLimit-Limit', capacity);
    res.set('X-RateLimit-Remaining', remaining);

    if (allowed === 0) {
      res.set('Retry-After', retryAfter);
      return res.status(429).json({ error: 'Too many requests' });
    }

    next();
  };
}

module.exports = leakyBucketLimiter;