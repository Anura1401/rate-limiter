const requestCounts = {}; // { ip: { count, resetTime } }

function fixedWindowLimiter(limit, windowMs) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();

    if (!requestCounts[key] || now > requestCounts[key].resetTime) {
      requestCounts[key] = { count: 1, resetTime: now + windowMs };
      return next();
    }

    if (requestCounts[key].count < limit) {
      requestCounts[key].count++;
      return next();
    }

    res.status(429).json({ error: 'Too many requests' });
  };
}

module.exports = fixedWindowLimiter;