const app = require('./app');
const PORT = Number(process.env.PORT || 5000);

if (require.main === module) {
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
}

module.exports = app;
