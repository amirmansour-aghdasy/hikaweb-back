// if (process.env.NODE_ENV !== 'production') {
//   await import('dotenv/config');
// }
import 'dotenv/config';
import { config } from './config/environment.js';
import { logger } from './utils/logger.js';
import { SystemLogger } from './utils/systemLogger.js';
import { schedulerService } from './services/scheduler.js';
import App from './app.js';

async function startServer() {
  try {
    const appInstance = new App();
    const app = appInstance.getExpressApp();

    const server = app.listen(config.PORT, async () => {
      logger.info(`🚀 هیکاوب بکند سرور روی پورت ${config.PORT} راه‌اندازی شد`);
      logger.info(`📚 مستندات API: http://localhost:${config.PORT}/api-docs`);
      logger.info(`🌍 محیط: ${config.NODE_ENV}`);

      // Log system startup
      await SystemLogger.logStartup({
        port: config.PORT,
        environment: config.NODE_ENV,
        uptime: process.uptime()
      });

      // Start scheduler service
      if (config.NODE_ENV !== 'test') {
        schedulerService.start();
      }

      // Send startup notification to Bale
      import('./utils/bale.js')
        .then(({ baleService }) => {
          if (baleService && typeof baleService.sendSystemAlert === 'function') {
            baleService
              .sendSystemAlert(
                `🚀 هیکاوب بکند با موفقیت روی پورت ${config.PORT} راه‌اندازی شد`,
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
      logger.info(`سیگنال ${signal} دریافت شد. شروع خاموشی...`);

      // Stop scheduler
      schedulerService.stop();

      // Log system shutdown
      await SystemLogger.logShutdown({
        signal,
        uptime: process.uptime()
      });

      server.close(async () => {
        logger.info('سرور HTTP بسته شد');

        try {
          await appInstance.gracefulShutdown();
        } catch (error) {
          logger.error('خطا در خاموشی:', error);
          await SystemLogger.logCriticalError('خطا در خاموشی سیستم', error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        logger.error('اتصالات به موقع بسته نشدند، خاموشی اجباری');
        process.exit(1);
      }, 30000);
    }
  } catch (error) {
    logger.error('شروع سرور ناموفق بود:', error);
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
