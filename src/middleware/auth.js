import jwt from 'jsonwebtoken';
import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';
import { redisClient } from '../config/redis.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: req.t('auth.tokenRequired')
      });
    }

    const token = authHeader.substring(7);
    
    // Check blacklist
    try {
      const redis = redisClient.getClient();
      const isBlacklisted = await redis.get(`blacklist:${token}`);
      
      if (isBlacklisted) {
        return res.status(401).json({
          success: false,
          message: req.t('auth.tokenInvalid')
        });
      }
    } catch (redisError) {
      // If Redis is unavailable, continue without blacklist check
      // This ensures the system remains functional even if Redis is down
      logger.warn('Redis unavailable for token blacklist check:', redisError.message);
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    return res.status(401).json({
      success: false,
      message: error.name === 'TokenExpiredError' ? req.t('auth.tokenExpired') : req.t('auth.tokenInvalid')
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.JWT_SECRET);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions
      };
    }
    
    // Generate user identifier for anonymous users (for rating system)
    const { ArticleRatingService } = await import('../modules/articleRatings/service.js');
    req.userIdentifier = ArticleRatingService.generateUserIdentifier(req);
    
    next();
  } catch (error) {
    // Generate user identifier even if auth fails
    try {
      const { ArticleRatingService } = await import('../modules/articleRatings/service.js');
      req.userIdentifier = ArticleRatingService.generateUserIdentifier(req);
    } catch (err) {
      // Ignore
    }
    next();
  }
};