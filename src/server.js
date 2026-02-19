// if (process.env.NODE_ENV !== 'production') {
//   await import('dotenv/config');
// }
import 'dotenv/config';
import { config } from './config/environment.js';
import { logger } from './utils/logger.js';
import { PrettyLogger } from './utils/prettyLogger.js';
import { SystemLogger } from './utils/systemLogger.js';
import { schedulerService } from './services/scheduler.js';
import App from './app.js';

async function startServer() {
  try {
    const appInstance = new App();
    const app = appInstance.getExpressApp();

    const server = app.listen(config.PORT, async () => {
      // Display beautiful startup banner
      PrettyLogger.startupBanner(
        config.PORT,
        config.NODE_ENV,
        `http://localhost:${config.PORT}/api-docs`
      );

      logger.info(`Server started successfully on port ${config.PORT}`);

      if (!config.ENCRYPTION_KEY) {
        logger.warn('ENCRYPTION_KEY is not set (and JWT_SECRET fallback is empty). Email account passwords cannot be decrypted. Add ENCRYPTION_KEY or JWT_SECRET to .env and restart.');
      }

      // Log system startup
      await SystemLogger.logStartup({
        port: config.PORT,
        environment: config.NODE_ENV,
        uptime: process.uptime()
      });

      // Start scheduler service
      if (config.NODE_ENV !== 'test') {
        schedulerService.start();
        // Display scheduler jobs after a short delay
        setTimeout(() => {
          const status = schedulerService.getStatus();
          if (status.jobs.length > 0) {
            PrettyLogger.schedulerJobs(status.jobs);
          }
        }, 500);
      }

      // Send startup notification to Bale
      import('./utils/bale.js')
        .then(({ baleService }) => {
          if (baleService && typeof baleService.sendSystemAlert === 'function') {
            baleService
              .sendSystemAlert(
                `🚀 Hikaweb backend successfully started on port ${config.PORT}`,
                'success'
              )
              .catch(err => logger.warn('Bale notification failed:', err));
          }
        })
        .catch(err => logger.warn('Bale service not available:', err));
    });

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    async function gracefulShutdown(signal) {
      PrettyLogger.shutdown(signal);
      logger.info(`Signal ${signal} received. Starting graceful shutdown...`);

      // Stop scheduler
      schedulerService.stop();

      // Log system shutdown
      await SystemLogger.logShutdown({
        signal,
        uptime: process.uptime()
      });

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await appInstance.gracefulShutdown();
        } catch (error) {
          logger.error('Error during shutdown:', error);
          await SystemLogger.logCriticalError('System shutdown error', error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        logger.error('Connections did not close in time, forcing shutdown');
        process.exit(1);
      }, 30000);
    }
  } catch (error) {
    logger.error('Server startup failed:', error);
    process.exit(1);
  }
}

process.on('unhandledRejection', async (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await SystemLogger.logCriticalError('Unhandled Promise Rejection', reason, {
    promise: String(promise)
  });
  process.exit(1);
});

process.on('uncaughtException', async error => {
  logger.error('Uncaught Exception:', error);
  await SystemLogger.logCriticalError('Uncaught Exception', error);
  process.exit(1);
});

startServer();
