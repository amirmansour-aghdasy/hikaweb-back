import { redisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

/**
 * CSRF Protection Middleware for REST APIs
 * For state-changing requests (POST, PUT, DELETE, PATCH), requires CSRF token
 */
export const csrfProtection = async (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for public endpoints that don't require auth
  const publicPaths = [
    '/api/v1/auth/register',
    '/api/v1/auth/login',
    '/api/v1/auth/otp',
    '/api/v1/consultations',
    '/api/v1/health'
  ];

  const isPublicPath = publicPaths.some(path => req.path.startsWith(path));
  if (isPublicPath && !req.user) {
    return next();
  }

  // For authenticated requests, check CSRF token
  if (req.user) {
    const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;

    if (!csrfToken) {
      logger.warn(`CSRF token missing for ${req.method} ${req.path} by user ${req.user.id}`);
      return res.status(403).json({
        success: false,
        message: req.t ? req.t('security.csrfTokenRequired') : 'CSRF token required'
      });
    }

    // Verify token in Redis
    try {
      const redis = redisClient.getClient();
      const tokenKey = `csrf:${req.user.id}:${csrfToken}`;
      const isValid = await redis.get(tokenKey);

      if (!isValid) {
        logger.warn(`Invalid CSRF token for ${req.method} ${req.path} by user ${req.user.id}`);
        return res.status(403).json({
          success: false,
          message: req.t ? req.t('security.csrfTokenInvalid') : 'Invalid CSRF token'
        });
      }

      // Delete token after use (one-time use)
      await redis.del(tokenKey);
    } catch (error) {
      logger.error('CSRF verification error:', error);
      // If Redis fails, allow request (fail-open for availability)
      // In production, you might want to fail-closed
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({
          success: false,
          message: 'Service temporarily unavailable'
        });
      }
    }
  }

  next();
};

/**
 * Generate CSRF token for authenticated users
 */
export const generateCsrfToken = async (userId) => {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const redis = redisClient.getClient();
    const tokenKey = `csrf:${userId}:${token}`;

    // Store token with 1 hour expiration
    await redis.setEx(tokenKey, 3600, '1');

    return token;
  } catch (error) {
    logger.error('CSRF token generation error:', error);
    throw error;
  }
};

