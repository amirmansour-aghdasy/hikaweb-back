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
    const redis = redisClient.getClient();
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: req.t('auth.tokenInvalid')
      });
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
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    next();
  }
};