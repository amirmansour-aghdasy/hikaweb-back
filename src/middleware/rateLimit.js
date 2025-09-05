import rateLimit from 'express-rate-limit';
import { redisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';

// Simple Memory Store (fallback when Redis fails)
class MemoryStore {
  constructor() {
    this.store = new Map();
  }

  async increment(key) {
    const now = Date.now();
    const record = this.store.get(key) || { count: 0, resetTime: now + 15 * 60 * 1000 };
    
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + 15 * 60 * 1000;
    } else {
      record.count++;
    }
    
    this.store.set(key, record);
    
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
  }
}

// Redis Store with error handling
class RedisStore {
  constructor(options = {}) {
    this.prefix = options.prefix || 'rl:';
    this.windowMs = options.windowMs || 15 * 60 * 1000;
    this.client = redisClient;
    this.fallbackStore = new MemoryStore();
  }

  async increment(key) {
    try {
      // Check if Redis client is ready
      if (!this.client || !this.client.isReady) {
        logger.warn('Redis not ready, using memory store');
        return await this.fallbackStore.increment(key);
      }

      const fullKey = this.prefix + key;
      
      // Use Redis v4+ syntax
      const current = await this.client.incr(fullKey);
      
      if (current === 1) {
        await this.client.expire(fullKey, Math.ceil(this.windowMs / 1000));
      }
      
      return {
        totalHits: current,
        resetTime: new Date(Date.now() + this.windowMs)
      };
    } catch (error) {
      logger.warn('Redis rate limit error, using memory store:', error.message);
      return await this.fallbackStore.increment(key);
    }
  }

  async decrement(key) {
    try {
      if (!this.client || !this.client.isReady) {
        return await this.fallbackStore.decrement(key);
      }

      const fullKey = this.prefix + key;
      const current = await this.client.decr(fullKey);
      return Math.max(0, current);
    } catch (error) {
      logger.warn('Redis decrement error:', error.message);
      return await this.fallbackStore.decrement(key);
    }
  }

  async resetKey(key) {
    try {
      if (!this.client || !this.client.isReady) {
        return await this.fallbackStore.resetKey(key);
      }

      const fullKey = this.prefix + key;
      await this.client.del(fullKey);
    } catch (error) {
      logger.warn('Redis reset error:', error.message);
      await this.fallbackStore.resetKey(key);
    }
  }
}

// General rate limiter
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: {
    success: false,
    message: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:general:', windowMs: 15 * 60 * 1000 }),
  onLimitReached: (req, res, options) => {
    logger.warn('Rate limit exceeded:', {
      ip: req.ip,
      url: req.originalUrl,
      userAgent: req.get('User-Agent')
    });
  }
});

// Authentication rate limiter
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'تعداد تلاش‌های ورود بیش از حد مجاز است. لطفاً 15 دقیقه صبر کنید.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:auth:', windowMs: 15 * 60 * 1000 }),
  skipSuccessfulRequests: true
});

// Upload rate limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    message: 'تعداد آپلود فایل بیش از حد مجاز است. لطفاً یک ساعت صبر کنید.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:upload:', windowMs: 60 * 60 * 1000 })
});

// API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    success: false,
    message: 'تعداد درخواست‌های API بیش از حد مجاز است.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:api:', windowMs: 15 * 60 * 1000 })
});

// Password reset rate limiter
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: 'تعداد درخواست‌های بازیابی رمز عبور بیش از حد مجاز است.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:password:', windowMs: 60 * 60 * 1000 })
});

// OTP rate limiter
export const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: 'تعداد درخواست‌های کد تایید بیش از حد مجاز است.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:otp:', windowMs: 5 * 60 * 1000 })
});

// Contact form rate limiter
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'تعداد ارسال فرم تماس بیش از حد مجاز است.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:contact:', windowMs: 60 * 60 * 1000 })
});

// Comment rate limiter
export const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'تعداد ثبت نظرات بیش از حد مجاز است.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:comment:', windowMs: 15 * 60 * 1000 })
});

// Create dynamic rate limiter
export const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
      success: false,
      message: 'تعداد درخواست‌ها بیش از حد مجاز است.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({ 
      prefix: options.prefix || 'rl:custom:', 
      windowMs: options.windowMs || 15 * 60 * 1000 
    })
  };

  return rateLimit({ ...defaultOptions, ...options });
};

// Rate limit by user ID
export const createUserRateLimiter = (options = {}) => {
  return rateLimit({
    ...options,
    keyGenerator: (req) => {
      return req.user ? `user:${req.user.id}` : req.ip;
    }
  });
};