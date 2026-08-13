require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.info(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'KSIT Dormitory API is running.',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api', require('./routes/domain.routes'));

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
