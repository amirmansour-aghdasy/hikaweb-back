// src/server.js
import { config } from './config/environment.js';
import { logger } from './utils/logger.js';
import App from './app.js';

async function startServer() {
  try {
    const appInstance = new App();
    const app = appInstance.getExpressApp();

    const server = app.listen(config.PORT, () => {
      logger.info(`🚀 هیکاوب بکند سرور روی پورت ${config.PORT} راه‌اندازی شد`);
      logger.info(`📚 مستندات API: http://localhost:${config.PORT}/api-docs`);
      logger.info(`🌍 محیط: ${config.NODE_ENV}`);
      
      // Send startup notification (safely)
      import('./utils/telegram.js')
        .then(({ telegramService }) => {
          if (telegramService && typeof telegramService.sendSystemAlert === 'function') {
            telegramService.sendSystemAlert(
              `🚀 هیکاوب بکند با موفقیت روی پورت ${config.PORT} راه‌اندازی شد`,
              'info'
            ).catch(err => logger.warn('Telegram notification failed:', err));
          }
        })
        .catch(err => logger.warn('Telegram service not available:', err));
    });

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    function gracefulShutdown(signal) {
      logger.info(`سیگنال ${signal} دریافت شد. شروع خاموشی...`);
      
      server.close(async () => {
        logger.info('سرور HTTP بسته شد');
        
        try {
          await appInstance.gracefulShutdown();
        } catch (error) {
          logger.error('خطا در خاموشی:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
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

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();