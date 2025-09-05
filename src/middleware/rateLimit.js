// src/middleware/rateLimiting.js
import rateLimit from 'express-rate-limit';
import { redisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';

// Redis store for express-rate-limit v7
class RedisStore {
  constructor(options = {}) {
    this.prefix = options.prefix || 'rl:';
    this.client = redisClient;
    this.windowMs = options.windowMs || 15 * 60 * 1000;
  }

  async increment(key) {
    const fullKey = this.prefix + key;
    const current = await this.client.incr(fullKey);

    if (current === 1) {
      await this.client.expire(fullKey, Math.floor(this.windowMs / 1000));
    }

    return {
      totalHits: current,
      resetTime: new Date(Date.now() + this.windowMs)
    };
  }

  async decrement(key) {
    const fullKey = this.prefix + key;
    const current = await this.client.decr(fullKey);
    return Math.max(0, current);
  }

  async resetKey(key) {
    await this.client.del(this.prefix + key);
  }

  async resetAll() {
    const keys = await this.client.keys(this.prefix + '*');
    if (keys.length) {
      await this.client.del(keys);
    }
  }
}

// Helper برای ایجاد handler با لاگ
const createHandler = (message, logData = {}) => (req, res) => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    url: req.originalUrl,
    user: req.user?.email,
    fileCount: req.files?.length || 0,
    ...logData
  });

  res.status(429).json(message);
};

// === General limiter ===
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:general:', windowMs: 15 * 60 * 1000 }),
  handler: createHandler({
    success: false,
    message: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید.',
    retryAfter: '15 minutes'
  })
});

// === Authentication limiter ===
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:auth:', windowMs: 15 * 60 * 1000 }),
  handler: createHandler({
    success: false,
    message: 'تعداد تلاش‌های ورود بیش از حد مجاز است. لطفاً 15 دقیقه صبر کنید.',
    retryAfter: '15 minutes'
  }, { body: { email: '' } })
});

// === Upload limiter ===
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:upload:', windowMs: 60 * 60 * 1000 }),
  handler: createHandler({
    success: false,
    message: 'تعداد آپلود فایل بیش از حد مجاز است. لطفاً یک ساعت صبر کنید.',
    retryAfter: '1 hour'
  })
});

// === API limiter ===
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:api:', windowMs: 15 * 60 * 1000 }),
  handler: createHandler({
    success: false,
    message: 'تعداد درخواست‌های API بیش از حد مجاز است.',
    retryAfter: '15 minutes'
  })
});

// === Password reset limiter ===
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:password:', windowMs: 60 * 60 * 1000 }),
  handler: createHandler({
    success: false,
    message: 'تعداد درخواست‌های بازیابی رمز عبور بیش از حد مجاز است.',
    retryAfter: '1 hour'
  })
});

// === OTP limiter ===
export const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:otp:', windowMs: 5 * 60 * 1000 }),
  handler: createHandler({
    success: false,
    message: 'تعداد درخواست‌های کد تایید بیش از حد مجاز است.',
    retryAfter: '5 minutes'
  })
});

// === Contact form limiter ===
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:contact:', windowMs: 60 * 60 * 1000 }),
  handler: createHandler({
    success: false,
    message: 'تعداد ارسال فرم تماس بیش از حد مجاز است.',
    retryAfter: '1 hour'
  })
});

// === Comment limiter ===
export const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:comment:', windowMs: 15 * 60 * 1000 }),
  handler: createHandler({
    success: false,
    message: 'تعداد ثبت نظرات بیش از حد مجاز است.',
    retryAfter: '15 minutes'
  })
});

// === Dynamic limiter ===
export const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({ prefix: options.prefix || 'rl:custom:', windowMs: options.windowMs || 15 * 60 * 1000 }),
    handler: createHandler({
      success: false,
      message: 'تعداد درخواست‌ها بیش از حد مجاز است.',
      retryAfter: '15 minutes'
    })
  };

  return rateLimit({ ...defaultOptions, ...options });
};

// === User-based limiter ===
export const createUserRateLimiter = (options = {}) => {
  return rateLimit({
    ...options,
    keyGenerator: (req) => (req.user ? `user:${req.user.id}` : req.ip),
    store: new RedisStore({ prefix: options.prefix || 'rl:user:', windowMs: options.windowMs || 15 * 60 * 1000 }),
    handler: createHandler({
      success: false,
      message: 'تعداد درخواست‌ها بیش از حد مجاز است.',
      retryAfter: '15 minutes'
    })
  });
};
