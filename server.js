const express = require('express');
const fixedWindowLimiter = require('./src/middleware/limiter');
const tokenBucketLimiter = require('./src/middleware/tokenBucketLimiter');
const app = express();


app.get('/api/hello', fixedWindowLimiter(5, 60), (req, res) => {
  res.json({ message: 'Hello! Request allowed.' });
});

app.get('/api/bucket-test', tokenBucketLimiter(5, 0.5), (req, res) => {
  res.json({ message: 'Token bucket allowed this request.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));