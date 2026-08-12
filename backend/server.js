require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = Number(process.env.PORT || 5000);
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

const server = app.listen(PORT, () => {
  console.info(`KSIT Dormitory API listening on http://localhost:${PORT} (${process.env.NODE_ENV || 'development'}).`);
});

function gracefulShutdown(signal) {
  console.info(`${signal} received: closing HTTP server.`);
  server.close(() => {
    console.info('HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
