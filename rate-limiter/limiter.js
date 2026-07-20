const Redis = require('ioredis');
const redis = new Redis(); // connects to localhost:6379 by default

function fixedWindowLimiter(limit, windowSeconds) {
  return async (req, res, next) => {
    const key = `rate:${req.ip}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    if (count > limit) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    next();
  };
}

module.exports = fixedWindowLimiter;