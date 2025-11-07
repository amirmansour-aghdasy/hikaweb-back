import { logger } from '../utils/logger.js';
import { baleService } from '../utils/bale.js';
import { AppError } from '../utils/appError.js';
import { getErrorMessage } from '../utils/errorMessages.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import { SystemLogger } from '../utils/systemLogger.js';
import { SecurityUtils } from '../utils/security.js';
import { config } from '../config/environment.js';

/**
 * Global Error Handler Middleware
 * Handles all types of errors including AppError, MongoDB errors, and system errors
 */
export const errorHandler = async (err, req, res, next) => {
  // Get user language preference
  const language = req.language || req.headers['accept-language'] || 'fa';
  
  // Log error details to winston
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user?.email || 'Anonymous',
    body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined,
    timestamp: new Date().toISOString()
  });

  // Log critical errors to MongoDB System Log
  if (err.statusCode >= 500 || !err.statusCode) {
    await SystemLogger.logCriticalError(
      `خطای سیستم: ${err.message}`,
      err,
      {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        user: req.user?.email || 'Anonymous',
        statusCode: err.statusCode
      }
    ).catch(logErr => {
      // Don't break error handling if logging fails
      logger.error('Failed to log system error:', logErr);
    });
  }

  let error = { ...err };
  error.message = err.message;

  // Handle different error types
  if (err instanceof AppError) {
    // Custom AppError - already formatted
    error = err;
  } else if (err.name === 'ValidationError') {
    // Mongoose validation error
    const message = getErrorMessage('validationError', language);
    error = new AppError(message, HTTP_STATUS.BAD_REQUEST);
    
    // Add validation details
    if (err.errors) {
      error.details = Object.keys(err.errors).map(key => ({
        field: key,
        message: err.errors[key].message
      }));
    }
  } else if (err.name === 'CastError') {
    // MongoDB cast error (invalid ObjectId)
    const message = getErrorMessage('invalidId', language);
    error = new AppError(message, HTTP_STATUS.BAD_REQUEST);
  } else if (err.code === 11000) {
    // MongoDB duplicate key error
    const field = Object.keys(err.keyValue)[0];
    const message = getErrorMessage('duplicateEntry', language);
    error = new AppError(`${message}: ${field}`, HTTP_STATUS.CONFLICT);
  } else if (err.name === 'JsonWebTokenError') {
    // JWT error
    const message = getErrorMessage('tokenInvalid', language);
    error = new AppError(message, HTTP_STATUS.UNAUTHORIZED);
  } else if (err.name === 'TokenExpiredError') {
    // JWT expired
    const message = getErrorMessage('tokenExpired', language);
    error = new AppError(message, HTTP_STATUS.UNAUTHORIZED);
  } else if (err.name === 'MulterError') {
    // File upload error
    let message;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = getErrorMessage('fileTooLarge', language);
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = getErrorMessage('tooManyFiles', language);
    } else {
      message = getErrorMessage('fileUploadError', language);
    }
    error = new AppError(message, HTTP_STATUS.BAD_REQUEST);
  } else if (err.code === 'ENOENT') {
    // File not found
    const message = getErrorMessage('fileNotFound', language);
    error = new AppError(message, HTTP_STATUS.NOT_FOUND);
  } else if (err.code === 'ECONNREFUSED') {
    // Connection refused (database, redis, etc.)
    const message = getErrorMessage('serviceUnavailable', language);
    error = new AppError(message, HTTP_STATUS.SERVICE_UNAVAILABLE);
  } else {
    // Unknown error - treat as internal server error
    const message = getErrorMessage('internalError', language);
    error = new AppError(message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  // Send critical errors to Bale (تغییر از telegram به bale)
  if (error.statusCode >= 500) {
    baleService.sendErrorNotification({
      error: error.message,
      url: req.originalUrl,
      method: req.method,
      user: req.user?.email || 'Anonymous',
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }).catch(baleErr => {
      logger.error('Failed to send Bale notification:', baleErr.message);
    });
  }

  // Sanitize error message for production
  const isDevelopment = config.NODE_ENV === 'development';
  const sanitizedMessage = isDevelopment 
    ? error.message 
    : SecurityUtils.sanitizeErrorMessage(error, false);

  // Prepare response
  const response = {
    success: false,
    message: sanitizedMessage,
    ...(error.details && { details: error.details }),
    ...(isDevelopment && {
      stack: error.stack,
      error: err
    })
  };

  // Send response
  res.status(error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR).json(response);
};

/**
 * Not Found Handler
 * Handles 404 errors for undefined routes
 */
export const notFoundHandler = (req, res) => {
  const language = req.language || req.headers['accept-language'] || 'fa';
  const message = getErrorMessage('routeNotFound', language);
  
  logger.warn('Route not found:', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};

/**
 * Async Error Handler
 * Wrapper for async route handlers to catch promise rejections
 */
export const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation Error Handler
 * Specifically for Joi validation errors
 */
export const validationErrorHandler = (err, req, res, next) => {
  if (err.isJoi) {
    const language = req.language || 'fa';
    const details = err.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    const error = new AppError(
      getErrorMessage('validationFailed', language),
      HTTP_STATUS.UNPROCESSABLE_ENTITY
    );
    error.details = details;

    return next(error);
  }
  
  next(err);
};

/**
 * Rate Limit Error Handler
 * Custom handler for rate limiting errors
 */
export const rateLimitErrorHandler = (req, res) => {
  const language = req.language || 'fa';
  const message = getErrorMessage('tooManyRequests', language);
  
  logger.warn('Rate limit exceeded:', {
    ip: req.ip,
    url: req.originalUrl,
    userAgent: req.get('User-Agent')
  });

  res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
    success: false,
    message,
    retryAfter: req.rateLimit?.resetTime || '1 hour'
  });
};

/**
 * Development Error Handler
 * Provides detailed error information in development mode
 */
export const developmentErrorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return next(err);
  }

  console.error('🚨 Development Error Details:');
  console.error('Message:', err.message);
  console.error('Stack:', err.stack);
  console.error('Request:', {
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    body: req.body,
    params: req.params,
    query: req.query
  });

  next(err);
};

/**
 * Production Error Handler
 * Sanitizes errors for production environment
 */
export const productionErrorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    return next(err);
  }

  // Don't leak error details in production
  if (!(err instanceof AppError) && err.statusCode >= 500) {
    err.message = 'Something went wrong';
    delete err.stack;
  }

  next(err);
};