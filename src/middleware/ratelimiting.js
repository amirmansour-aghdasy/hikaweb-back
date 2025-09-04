import rateLimit from 'express-rate-limit';
import { config } from '../config/environment.js';

export const generalLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: { success: false, message: 'درخواست‌های زیادی ارسال کرده‌اید' }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'تلاش‌های زیادی برای ورود انجام داده‌اید' }
});

export const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  message: { success: false, message: 'لطفاً یک دقیقه صبر کنید' }
});