import { LogService } from '../modules/logs/service.js';

/**
 * System Logger Utility
 * Wrapper around LogService for easy system logging
 */
export class SystemLogger {
  /**
   * Log system startup
   */
  static async logStartup(metadata = {}) {
    return await LogService.createSystemLog(
      'info',
      'startup',
      'System started',
      {},
      metadata
    );
  }

  /**
   * Log system shutdown
   */
  static async logShutdown(metadata = {}) {
    return await LogService.createSystemLog(
      'info',
      'shutdown',
      'System shut down',
      {},
      metadata
    );
  }

  /**
   * Log database connection
   */
  static async logDatabaseConnection(status, details = {}) {
    const level = status === 'success' ? 'info' : 'error';
    return await LogService.createSystemLog(
      level,
      'database',
      `Database connection: ${status === 'success' ? 'success' : 'failed'}`,
      details,
      { status }
    );
  }

  /**
   * Log Redis connection
   */
  static async logRedisConnection(status, details = {}) {
    const level = status === 'success' ? 'info' : 'warn';
    return await LogService.createSystemLog(
      level,
      'redis',
      `Redis connection: ${status === 'success' ? 'success' : 'failed'}`,
      details,
      { status }
    );
  }

  /**
   * Log external service errors
   */
  static async logExternalServiceError(service, error, details = {}) {
    return await LogService.createSystemLog(
      'error',
      'external_service',
      `External service error: ${service}`,
      { error: error.message, stack: error.stack, ...details },
      { service }
    );
  }

  /**
   * Log critical system errors
   */
  static async logCriticalError(message, error, details = {}) {
    return await LogService.createSystemLog(
      'critical',
      'error',
      message,
      { error: error.message, stack: error.stack, ...details },
      {}
    );
  }
}

