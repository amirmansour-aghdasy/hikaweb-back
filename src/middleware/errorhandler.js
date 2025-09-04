import { logger } from '../utils/logger.js';
import { telegramService } from '../utils/telegram.js';

export const errorHandler = (err, req, res, next) => {
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    user: req.user?.email
  });

  let status = err.status || 500;
  let message = err.message || req.t('common.internalError');

  if (err.name === 'ValidationError') {
    status = 400;
    message = req.t('validation.failed');
  } else if (err.name === 'CastError') {
    status = 400;
    message = req.t('common.invalidId');
  } else if (err.code === 11000) {
    status = 409;
    message = req.t('common.duplicateEntry');
  }

  res.status(status).json({
    success: false,
    message
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: req.t('common.routeNotFound')
  });
};