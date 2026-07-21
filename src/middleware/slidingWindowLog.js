const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');
const {recordStat} = require('./stats');

const redis = new Redis();
const script = fs.readFileSync(path.join(__dirname, '../scripts/sliding_window_log.lua'), 'utf8');

function slidingWindowLogLimiter(limit, windowSeconds) {
  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const identifier = apiKey || req.ip;
    const key = `swlog:${identifier}`;
    const now = Date.now() / 1000;

    const allowed = await redis.eval(script, 1, key, limit, windowSeconds, now);

    await recordStat('slidingWindowLog', allowed === 1);

    if (allowed === 0) {
    return res.status(429).json({ error: 'Too many requests' });
    }
    next();
  };
}

module.exports = slidingWindowLogLimiter;