const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');

const redis = new Redis();
const script = fs.readFileSync(path.join(__dirname, '../scripts/leaky_bucket.lua'), 'utf8');

function leakyBucketLimiter(capacity, leakRate) {
  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const identifier = apiKey || req.ip;
    const key = `leaky:${identifier}`;
    const now = Math.floor(Date.now() / 1000);

    const allowed = await redis.eval(script, 1, key, capacity, leakRate, now);

    if (allowed === 0) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    next();
  };
}

module.exports = leakyBucketLimiter;