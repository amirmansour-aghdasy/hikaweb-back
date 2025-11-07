import crypto from 'crypto';
import { logger } from './logger.js';

/**
 * Security utility functions
 */
export class SecurityUtils {
  /**
   * Validate environment variables for security
   */
  static validateEnvironment() {
    const required = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      logger.error('Missing required environment variables:', missing);
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate JWT secrets are strong enough
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      logger.warn('JWT_SECRET is too short. Recommended: at least 32 characters');
    }

    if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
      logger.warn('JWT_REFRESH_SECRET is too short. Recommended: at least 32 characters');
    }

    return true;
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash sensitive data (for logging purposes)
   */
  static hashSensitiveData(data) {
    if (!data) return '***';
    if (typeof data !== 'string') return '***';
    if (data.length <= 4) return '***';
    return `${data.substring(0, 2)}***${data.substring(data.length - 2)}`;
  }

  /**
   * Sanitize error message for client (remove sensitive info)
   */
  static sanitizeErrorMessage(error, isDevelopment = false) {
    if (isDevelopment) {
      return error.message;
    }

    // Don't expose internal errors
    if (error.message?.includes('password') || 
        error.message?.includes('secret') ||
        error.message?.includes('token') ||
        error.message?.includes('key')) {
      return 'خطای احراز هویت';
    }

    // Don't expose stack traces
    if (error.stack) {
      return error.message || 'خطای داخلی سرور';
    }

    return error.message || 'خطای داخلی سرور';
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];

    if (password.length < minLength) {
      errors.push(`رمز عبور باید حداقل ${minLength} کاراکتر باشد`);
    }

    if (!hasUpperCase) {
      errors.push('رمز عبور باید شامل حروف بزرگ باشد');
    }

    if (!hasLowerCase) {
      errors.push('رمز عبور باید شامل حروف کوچک باشد');
    }

    if (!hasNumbers) {
      errors.push('رمز عبور باید شامل عدد باشد');
    }

    // Special characters are optional but recommended
    // if (!hasSpecialChar) {
    //   errors.push('رمز عبور باید شامل کاراکتر خاص باشد');
    // }

    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password, hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar)
    };
  }

  /**
   * Calculate password strength score (0-100)
   */
  static calculatePasswordStrength(password, hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar) {
    let score = 0;

    // Length score (max 40 points)
    if (password.length >= 12) score += 40;
    else if (password.length >= 10) score += 30;
    else if (password.length >= 8) score += 20;
    else score += 10;

    // Character variety (max 60 points)
    if (hasUpperCase) score += 15;
    if (hasLowerCase) score += 15;
    if (hasNumbers) score += 15;
    if (hasSpecialChar) score += 15;

    return Math.min(100, score);
  }

  /**
   * Rate limit key generator
   */
  static generateRateLimitKey(identifier, action) {
    return `${action}:${identifier}`;
  }

  /**
   * Check if IP is in whitelist
   */
  static isIPWhitelisted(ip, whitelist = []) {
    if (!whitelist || whitelist.length === 0) return false;
    return whitelist.includes(ip) || whitelist.includes('*');
  }

  /**
   * Validate email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format (Iranian)
   */
  static isValidPhoneNumber(phone) {
    const phoneRegex = /^(\+98|0)?9\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Escape special characters for regex
   */
  static escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

