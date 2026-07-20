const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');

const redis = new Redis();
const script = fs.readFileSync(path.join(__dirname, '../scripts/token_bucket.lua'), 'utf8');

function tokenBucketLimiter(capacity, refillRate) {
  return async (req, res, next) => {
    const key = `bucket:${req.ip}`;
    const now = Math.floor(Date.now() / 1000);
    const allowed = await redis.eval(script, 1, key, capacity, refillRate, now);

    if (allowed === 0) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    next();
  };
}

module.exports = tokenBucketLimiter;