const express = require('express');
const fixedWindowLimiter = require('./rate-limiter/limiter');
const app = express();

app.use(fixedWindowLimiter(5, 60000));

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello! Request allowed.' });
});

app.listen(3000, () => console.log('Server running on port 3000'));