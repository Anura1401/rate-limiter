const Redis = require('ioredis');
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
});

async function recordStat(algorithm, allowed) {
  const field = allowed ? 'allowed' : 'blocked';
  await redis.hincrby(`stats:${algorithm}`, field, 1);
}

async function recordRemaining(algorithm, remaining, limit) {
  await redis.hset(`stats:${algorithm}`, 'lastRemaining', remaining, 'limit', limit);
}

async function getAllStats() {
  const algorithms = ['fixedWindow', 'tokenBucket', 'slidingWindowLog', 'leakyBucket'];
  const results = {};

  for (const algo of algorithms) {
    const data = await redis.hgetall(`stats:${algo}`);
    results[algo] = {
      allowed: parseInt(data.allowed || 0),
      blocked: parseInt(data.blocked || 0),
      remaining: data.lastRemaining !== undefined ? parseInt(data.lastRemaining) : null,
      limit: data.limit !== undefined ? parseInt(data.limit) : null,
    };
  }
  return results;
}

module.exports = { recordStat, recordRemaining, getAllStats };