const Redis = require('ioredis');
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
});
async function recordStat(algorithm, allowed) {
  const field = allowed ? 'allowed' : 'blocked';
  await redis.hincrby(`stats:${algorithm}`, field, 1);
}

async function getAllStats() {
  const algorithms = ['fixedWindow', 'tokenBucket', 'slidingWindowLog', 'leakyBucket'];
  
  const promises = algorithms.map(async (algo) => {
    const data = await redis.hgetall(`stats:${algo}`);
    return [algo, {
      allowed: parseInt(data.allowed || 0),
      blocked: parseInt(data.blocked || 0),
    }];
  });

  const entries = await Promise.all(promises);
  return Object.fromEntries(entries);
}

module.exports = { recordStat, getAllStats };