const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');

const redis = new Redis(); 
const script = fs.readFileSync(path.join(__dirname, '../scripts/sliding_window.lua'), 'utf8');


function fixedWindowLimiter(limit, windowSeconds) {
  return async (req, res, next) => {
    const key = `rate:${req.ip}`;
    const allowed = await redis.eval(script, 1, key, limit, windowSeconds);

    if (allowed === 0) {
       return res.status(429).json({ error: 'Too many requests' });
    }

    next();
  };
}

module.exports = fixedWindowLimiter;