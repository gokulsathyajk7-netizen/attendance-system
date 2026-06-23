import app from './app.js';
import { connectDB } from './config/db.js';
import logger from './config/logger.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
try {
// Connect Database
await connectDB();

// Start HTTP Server
const server = app.listen(PORT, () => {
  logger.info(
    `Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`
  );
});

// Graceful Shutdown
const shutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);

  server.close(() => {
    logger.info('HTTP server closed successfully.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);

  server.close(() => {
    process.exit(1);
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

} catch (err) {
logger.error('Server startup failed:', err);
process.exit(1);
}
};

startServer();
