/**
 * Global error handling middleware
 * Catches all errors and returns a consistent JSON response
 */
const { systemLogNotification } = require('../services/telegram.service');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (statusCode >= 500) {
    void systemLogNotification({
      level: 'ERROR',
      description: `${req.method} ${req.originalUrl} failed with HTTP ${statusCode}: ${message}`,
    });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = {
  errorHandler,
  notFoundHandler
};
