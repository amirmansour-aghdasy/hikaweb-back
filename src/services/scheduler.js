import cron from 'node-cron';
import { CalendarService } from '../modules/calendar/service.js';
import { TaskService } from '../modules/tasks/service.js';
import { logger } from '../utils/logger.js';
import { SystemLogger } from '../utils/systemLogger.js';

class SchedulerService {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  /**
   * Start all scheduled jobs
   */
  start() {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('🕐 Scheduler service started');

    // Calendar reminders - every 5 minutes
    const calendarRemindersJob = cron.schedule('*/5 * * * *', async () => {
      try {
        logger.debug('Running calendar reminders job...');
        await CalendarService.sendReminders();
      } catch (error) {
        logger.error('Error in calendar reminders job:', error);
        await SystemLogger.logCriticalError(
          'خطا در ارسال یادآوری‌های تقویم',
          error
        );
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Tehran'
    });

    // Task reminders - every 15 minutes
    const taskRemindersJob = cron.schedule('*/15 * * * *', async () => {
      try {
        logger.debug('Running task reminders job...');
        await TaskService.sendTaskReminders();
      } catch (error) {
        logger.error('Error in task reminders job:', error);
        await SystemLogger.logCriticalError(
          'خطا در ارسال یادآوری‌های وظایف',
          error
        );
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Tehran'
    });

    // Log cleanup - daily at 2 AM
    const logCleanupJob = cron.schedule('0 2 * * *', async () => {
      try {
        logger.debug('Running log cleanup job...');
        const { LogService } = await import('../modules/logs/service.js');
        await LogService.cleanupOldLogs(90);
        logger.info('Log cleanup completed');
      } catch (error) {
        logger.error('Error in log cleanup job:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Tehran'
    });

    // Start all jobs
    calendarRemindersJob.start();
    taskRemindersJob.start();
    logCleanupJob.start();

    this.jobs = [
      { name: 'calendar-reminders', job: calendarRemindersJob, interval: '5 minutes' },
      { name: 'task-reminders', job: taskRemindersJob, interval: '15 minutes' },
      { name: 'log-cleanup', job: logCleanupJob, interval: 'daily at 2 AM' }
    ];

    logger.info(`✅ ${this.jobs.length} scheduled jobs started`);
    this.jobs.forEach(({ name, interval }) => {
      logger.info(`  - ${name}: ${interval}`);
    });
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.jobs.forEach(({ name, job }) => {
      job.stop();
      logger.info(`Stopped job: ${name}`);
    });

    this.jobs = [];
    this.isRunning = false;
    logger.info('🛑 Scheduler service stopped');
  }

  /**
   * Get status of all jobs
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobs: this.jobs.map(({ name, interval, job }) => ({
        name,
        interval,
        running: job.running || false
      }))
    };
  }
}

export const schedulerService = new SchedulerService();

