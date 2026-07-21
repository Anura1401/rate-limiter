const express = require('express');
const path = require('path');
const fixedWindowLimiter = require('./src/middleware/limiter');
const tokenBucketLimiter = require('./src/middleware/tokenBucketLimiter');
const slidingWindowLogLimiter = require('./src/middleware/slidingWindowLog');
const leakyBucketLimiter = require('./src/middleware/leakyBucketLimiter');
const {getAllStats} = require('./src/middleware/stats.js');
const app = express();

app.use(express.static(path.join(__dirname, './public')));

app.get('/api/hello', fixedWindowLimiter(5, 60), (req, res) => {
  res.json({ message: 'Hello! Request allowed.' });
});

app.get('/api/bucket-test', tokenBucketLimiter(5, 0.5), (req, res) => {
  res.json({ message: 'Token bucket allowed this request.' });
});

app.get('/api/swlog-test', slidingWindowLogLimiter(5, 60), (req, res) => {
  res.json({ message: 'Sliding window log allowed this request.' });
});

app.get('/api/leaky-test', leakyBucketLimiter(5, 0.1), (req, res) => {
  res.json({ message: 'Leaky bucket allowed this request.' });
});

app.get('/api/stats', async (req, res) => {
  const stats = await getAllStats();
  res.json(stats);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));