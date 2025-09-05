/**
 * Custom Application Error Class
 * Extends the built-in Error class with additional properties for better error handling
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create a Bad Request error (400)
   */
  static badRequest(message = 'درخواست نامعتبر') {
    return new AppError(message, 400);
  }

  /**
   * Create an Unauthorized error (401)
   */
  static unauthorized(message = 'عدم احراز هویت') {
    return new AppError(message, 401);
  }

  /**
   * Create a Forbidden error (403)
   */
  static forbidden(message = 'عدم دسترسی') {
    return new AppError(message, 403);
  }

  /**
   * Create a Not Found error (404)
   */
  static notFound(message = 'یافت نشد') {
    return new AppError(message, 404);
  }

  /**
   * Create a Conflict error (409)
   */
  static conflict(message = 'تداخل در داده‌ها') {
    return new AppError(message, 409);
  }

  /**
   * Create a Validation error (422)
   */
  static validation(message = 'خطا در اعتبارسنجی') {
    return new AppError(message, 422);
  }

  /**
   * Create a Too Many Requests error (429)
   */
  static tooManyRequests(message = 'تعداد درخواست‌ها بیش از حد مجاز') {
    return new AppError(message, 429);
  }

  /**
   * Create an Internal Server error (500)
   */
  static internal(message = 'خطای داخلی سرور') {
    return new AppError(message, 500);
  }

  /**
   * Create a Service Unavailable error (503)
   */
  static serviceUnavailable(message = 'سرویس در دسترس نیست') {
    return new AppError(message, 503);
  }

  /**
   * Convert error to JSON format
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      status: this.status,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
    };
  }
}
