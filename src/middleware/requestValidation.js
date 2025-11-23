import { logger } from '../utils/logger.js';
import { SystemLogger } from '../utils/systemLogger.js';

/**
 * Request validation middleware
 * Validates request size, headers, and basic security checks
 */
export const requestValidation = (req, res, next) => {
  try {
    // Check request size (prevent DoS)
    const contentLength = req.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB
      return res.status(413).json({
        success: false,
        message: 'حجم درخواست بیش از حد مجاز است'
      });
    }

    // Validate Content-Type for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.get('content-type');
      // Allow requests without body (empty body) - some endpoints don't need body
      const hasBody = req.get('content-length') && parseInt(req.get('content-length')) > 0;
      
      if (hasBody) {
        if (!contentType || !contentType.includes('application/json')) {
          // Allow multipart/form-data for file uploads
          if (!contentType || !contentType.includes('multipart/form-data')) {
            return res.status(400).json({
              success: false,
              message: 'Content-Type باید application/json باشد'
            });
          }
        }
      }
    }

    // Log suspicious requests
    const userAgent = req.get('user-agent') || '';
    const suspiciousPatterns = [
      /sql/i,
      /union/i,
      /select/i,
      /script/i,
      /<script/i,
      /javascript:/i,
      /onerror/i,
      /onload/i
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => 
      pattern.test(req.url) || pattern.test(userAgent) || pattern.test(JSON.stringify(req.body || {}))
    );

    if (isSuspicious) {
      logger.warn('Suspicious request detected', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent
      });

      SystemLogger.createSystemLog(
        'warn',
        'security',
        'درخواست مشکوک شناسایی شد',
        {
          ip: req.ip,
          url: req.url,
          method: req.method,
          userAgent
        }
      ).catch(err => logger.error('Failed to log suspicious request:', err));
    }

    next();
  } catch (error) {
    logger.error('Request validation error:', error);
    next();
  }
};

