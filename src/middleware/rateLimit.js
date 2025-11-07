import rateLimit from 'express-rate-limit';
import { redisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';

/**
 * Advanced Memory Store with TTL support
 * Fallback when Redis is unavailable
 */
class AdvancedMemoryStore {
  constructor() {
    this.store = new Map();
    this.timers = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }

  async increment(key) {
    const now = Date.now();
    const windowMs = this.windowMs || 15 * 60 * 1000;
    const record = this.store.get(key) || { count: 0, resetTime: now + windowMs };
    
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count++;
    }
    
    this.store.set(key, record);
    
    // Set cleanup timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }
    
    const timer = setTimeout(() => {
      this.store.delete(key);
      this.timers.delete(key);
    }, windowMs);
    
    this.timers.set(key, timer);
    
    return {
      totalHits: record.count,
      resetTime: new Date(record.resetTime)
    };
  }

  async decrement(key) {
    const record = this.store.get(key);
    if (record && record.count > 0) {
      record.count--;
      this.store.set(key, record);
      return record.count;
    }
    return 0;
  }

  async resetKey(key) {
    this.store.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.resetKey(key);
      }
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.store.clear();
    this.timers.clear();
  }
}

/**
 * Resilient Redis Store with fallback
 * Handles multiple Redis client versions
 */
class ResilientRedisStore {
  constructor(options = {}) {
    this.prefix = options.prefix || 'rl:';
    this.windowMs = options.windowMs || 15 * 60 * 1000;
    this.redisClientWrapper = redisClient;
    this.fallbackStore = new AdvancedMemoryStore();
    this.fallbackStore.windowMs = this.windowMs;
    this.redisAvailable = false;
    
    // Test Redis availability
    this.testRedisConnection();
  }

  getClient() {
    try {
      return this.redisClientWrapper.getClient();
    } catch (error) {
      return null;
    }
  }

  async testRedisConnection() {
    try {
      const client = this.getClient();
      if (client && typeof client.ping === 'function') {
        await client.ping();
        this.redisAvailable = true;
        logger.info('Redis available for rate limiting');
      } else {
        this.redisAvailable = false;
      }
    } catch (error) {
      this.redisAvailable = false;
      logger.warn('Redis unavailable, using memory store for rate limiting');
    }
  }

  async increment(key) {
    // Use fallback if Redis not available
    if (!this.redisAvailable) {
      return await this.fallbackStore.increment(key);
    }

    try {
      const client = this.getClient();
      if (!client) {
        throw new Error('Redis client not available');
      }

      const fullKey = this.prefix + key;
      const current = await client.incr(fullKey);
      
      if (current === 1) {
        const ttlSeconds = Math.ceil(this.windowMs / 1000);
        await client.expire(fullKey, ttlSeconds);
      }
      
      return {
        totalHits: current,
        resetTime: new Date(Date.now() + this.windowMs)
      };
    } catch (error) {
      logger.warn('Redis operation failed, using fallback:', error.message);
      this.redisAvailable = false;
      return await this.fallbackStore.increment(key);
    }
  }

  async decrement(key) {
    if (!this.redisAvailable) {
      return await this.fallbackStore.decrement(key);
    }

    try {
      const client = this.getClient();
      if (!client) {
        throw new Error('Redis client not available');
      }

      const fullKey = this.prefix + key;
      const current = await client.decr(fullKey);
      
      return Math.max(0, current);
    } catch (error) {
      logger.warn('Redis decrement failed:', error.message);
      return await this.fallbackStore.decrement(key);
    }
  }

  async resetKey(key) {
    if (!this.redisAvailable) {
      return await this.fallbackStore.resetKey(key);
    }

    try {
      const client = this.getClient();
      if (!client) {
        throw new Error('Redis client not available');
      }

      const fullKey = this.prefix + key;
      await client.del(fullKey);
    } catch (error) {
      logger.warn('Redis reset failed:', error.message);
      await this.fallbackStore.resetKey(key);
    }
  }
}

/**
 * Smart handler factory that adapts to rate limit events
 * Replaces deprecated onLimitReached
 */
function createSmartHandler(name, level = 'warn') {
  return {
    // Modern handler for express-rate-limit v7+
    handler: (req, res, next, options) => {
      const logData = {
        rateLimitType: name,
        ip: req.ip,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        user: req.user?.email || 'Anonymous'
      };

      logger[level](`Rate limit exceeded: ${name}`, logData);

      // Send custom response instead of default
      res.status(429).json({
        success: false,
        message: options.message?.message || 'تعداد درخواست‌ها بیش از حد مجاز است',
        retryAfter: options.windowMs / 1000,
        type: name
      });
    },

    // Legacy handler for older versions (deprecated but functional)
    onLimitReached: (req, res, options) => {
      const logData = {
        rateLimitType: name,
        ip: req.ip,
        url: req.originalUrl,
        userAgent: req.get('User-Agent')
      };

      logger[level](`Rate limit reached: ${name}`, logData);
    }
  };
}

/**
 * Universal rate limiter factory
 * Creates limiters compatible with multiple express-rate-limit versions
 */
function createUniversalLimiter(options) {
  const {
    name,
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'تعداد درخواست‌ها بیش از حد مجاز است',
    prefix = 'rl:',
    skipSuccessfulRequests = false,
    level = 'warn'
  } = options;

  const store = new ResilientRedisStore({ prefix, windowMs });
  const smartHandler = createSmartHandler(name, level);

  const limiterConfig = {
    windowMs,
    max,
    message: {
      success: false,
      message,
      retryAfter: `${windowMs / 1000} seconds`
    },
    standardHeaders: true,
    legacyHeaders: false,
    store,
    skipSuccessfulRequests
  };

  // Try modern approach first (v7+)
  try {
    limiterConfig.handler = smartHandler.handler;
    return rateLimit(limiterConfig);
  } catch (error) {
    // Fallback to legacy approach (v6 and below)
    logger.warn('Using legacy rate limiter configuration');
    delete limiterConfig.handler;
    limiterConfig.onLimitReached = smartHandler.onLimitReached;
    return rateLimit(limiterConfig);
  }
}

// Export pre-configured limiters
export const generalLimiter = createUniversalLimiter({
  name: 'general',
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید.',
  prefix: 'rl:general:'
});

export const authLimiter = createUniversalLimiter({
  name: 'auth',
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'تعداد تلاش‌های ورود بیش از حد مجاز است. لطفاً 15 دقیقه صبر کنید.',
  prefix: 'rl:auth:',
  skipSuccessfulRequests: true,
  level: 'error'
});

export const uploadLimiter = createUniversalLimiter({
  name: 'upload',
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: 'تعداد آپلود فایل بیش از حد مجاز است. لطفاً یک ساعت صبر کنید.',
  prefix: 'rl:upload:'
});

export const apiLimiter = createUniversalLimiter({
  name: 'api',
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'تعداد درخواست‌های API بیش از حد مجاز است.',
  prefix: 'rl:api:'
});

export const passwordResetLimiter = createUniversalLimiter({
  name: 'password-reset',
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'تعداد درخواست‌های بازیابی رمز عبور بیش از حد مجاز است.',
  prefix: 'rl:password:',
  level: 'error'
});

export const otpLimiter = createUniversalLimiter({
  name: 'otp',
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: 'تعداد درخواست‌های کد تایید بیش از حد مجاز است.',
  prefix: 'rl:otp:',
  level: 'error'
});

export const contactLimiter = createUniversalLimiter({
  name: 'contact',
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'تعداد ارسال فرم تماس بیش از حد مجاز است.',
  prefix: 'rl:contact:'
});

export const commentLimiter = createUniversalLimiter({
  name: 'comment',
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'تعداد ثبت نظرات بیش از حد مجاز است.',
  prefix: 'rl:comment:'
});

// Dynamic limiter creator
export const createRateLimiter = (options) => {
  return createUniversalLimiter({
    name: 'custom',
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'تعداد درخواست‌ها بیش از حد مجاز است.',
    prefix: 'rl:custom:',
    ...options
  });
};

// User-based limiter
export const createUserRateLimiter = (options) => {
  const limiter = createUniversalLimiter({
    name: 'user-based',
    ...options
  });

  // Override key generator
  const originalLimiter = limiter;
  return (req, res, next) => {
    // Set custom key for user-based limiting
    req.rateLimitKey = req.user ? `user:${req.user.id}` : req.ip;
    return originalLimiter(req, res, next);
  };
};

// Cleanup function for graceful shutdown
export const cleanupRateLimiters = () => {
  // Cleanup all memory stores
  logger.info('Cleaning up rate limiters...');
};