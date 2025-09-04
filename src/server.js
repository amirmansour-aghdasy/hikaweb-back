import { config } from './config/environment.js';
import { logger } from './utils/logger.js';
import { telegramService } from './utils/telegram.js';
import App from './app.js';

async function startServer() {
  try {
    const appInstance = new App();
    const app = appInstance.getApp();

    const server = app.listen(config.PORT, () => {
      logger.info(`🚀 هیکاوب بکند سرور روی پورت ${config.PORT} راه‌اندازی شد`);
      logger.info(`📚 مستندات API: http://localhost:${config.PORT}/api-docs`);
      logger.info(`🌍 محیط: ${config.NODE_ENV}`);
      
      // Send startup notification
      telegramService.sendSystemAlert(
        `🚀 هیکاوب بکند با موفقیت روی پورت ${config.PORT} راه‌اندازی شد`,
        'info'
      );
    });

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    function gracefulShutdown(signal) {
      logger.info(`سیگنال ${signal} دریافت شد. شروع خاموشی...`);
      
      server.close(async () => {
        logger.info('سرور HTTP بسته شد');
        
        try {
          const { Database } = await import('./config/database.js');
          const { redisClient } = await import('./config/redis.js');
          
          await Database.disconnect();
          await redisClient.disconnect();
          
          logger.info('خاموشی با موفقیت انجام شد');
          process.exit(0);
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

// Start the server
startServer();