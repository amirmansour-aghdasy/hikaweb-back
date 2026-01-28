import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import chalk from 'chalk';

// Custom format for console output with beautiful colors
const consoleFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let colorizedLevel;
  let icon = '';

  // Colorize log levels
  switch (level) {
    case 'error':
      colorizedLevel = chalk.red.bold(level.toUpperCase());
      icon = '❌';
      break;
    case 'warn':
      colorizedLevel = chalk.yellow.bold(level.toUpperCase());
      icon = '⚠️';
      break;
    case 'info':
      colorizedLevel = chalk.blue.bold(level.toUpperCase());
      icon = 'ℹ️';
      break;
    case 'debug':
      colorizedLevel = chalk.gray.bold(level.toUpperCase());
      icon = '🔍';
      break;
    default:
      colorizedLevel = chalk.white.bold(level.toUpperCase());
  }

  // Format timestamp
  const time = chalk.gray(`[${timestamp}]`);

  // Format message (preserve emojis and colors)
  let formattedMessage = message;
  
  // Extract metadata if exists
  const metaStr = Object.keys(metadata).length > 0 
    ? '\n' + chalk.gray(JSON.stringify(metadata, null, 2))
    : '';

  return `${time} ${icon} ${colorizedLevel}: ${formattedMessage}${metaStr}`;
});

// File format (JSON for structured logging)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: { service: 'hikaweb-backend' },
  transports: [
    // Console transport with beautiful formatting
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        consoleFormat
      )
    }),
    // File transport with JSON format
    new DailyRotateFile({
      filename: 'logs/system-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: fileFormat
    })
  ]
});

export const auditLogger = winston.createLogger({
  level: 'info',
  format: fileFormat,
  defaultMeta: { type: 'audit' },
  transports: [
    new DailyRotateFile({
      filename: 'logs/audit-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '50m',
      maxFiles: '365d',
      format: fileFormat
    })
  ]
});