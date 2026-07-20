const express = require('express');
const fixedWindowLimiter = require('./rate-limiter/limiter');
const app = express();

app.use(fixedWindowLimiter(5, 60000));

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello! Request allowed.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));