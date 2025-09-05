/**
 * Centralized Error Messages
 * Multi-language error messages for consistency
 */
export const errorMessages = {
  fa: {
    // Authentication
    invalidCredentials: 'نام کاربری یا رمز عبور اشتباه است',
    tokenExpired: 'توکن منقضی شده است',
    tokenInvalid: 'توکن نامعتبر است',
    accessDenied: 'عدم دسترسی',
    accountNotActive: 'حساب کاربری فعال نیست',

    // Validation
    required: 'این فیلد الزامی است',
    invalidEmail: 'فرمت ایمیل نامعتبر است',
    invalidPhone: 'شماره تلفن نامعتبر است',
    invalidUrl: 'آدرس اینترنتی نامعتبر است',
    minLength: 'حداقل {min} کاراکتر مجاز است',
    maxLength: 'حداکثر {max} کاراکتر مجاز است',

    // Database
    notFound: 'یافت نشد',
    duplicateEntry: 'این مقدار تکراری است',
    foreignKeyConstraint: 'نمی‌توان به دلیل وابستگی حذف کرد',

    // File Upload
    fileTooLarge: 'حجم فایل بیش از حد مجاز است',
    invalidFileType: 'نوع فایل پشتیبانی نمی‌شود',
    fileNotFound: 'فایل یافت نشد',

    // Rate Limiting
    tooManyRequests: 'تعداد درخواست‌ها بیش از حد مجاز است',

    // Server
    internalError: 'خطای داخلی سرور',
    serviceUnavailable: 'سرویس موقتاً در دسترس نیست'
  },

  en: {
    // Authentication
    invalidCredentials: 'Invalid username or password',
    tokenExpired: 'Token has expired',
    tokenInvalid: 'Invalid token',
    accessDenied: 'Access denied',
    accountNotActive: 'Account is not active',

    // Validation
    required: 'This field is required',
    invalidEmail: 'Invalid email format',
    invalidPhone: 'Invalid phone number',
    invalidUrl: 'Invalid URL format',
    minLength: 'Minimum {min} characters required',
    maxLength: 'Maximum {max} characters allowed',

    // Database
    notFound: 'Not found',
    duplicateEntry: 'This value already exists',
    foreignKeyConstraint: 'Cannot delete due to dependencies',

    // File Upload
    fileTooLarge: 'File size too large',
    invalidFileType: 'File type not supported',
    fileNotFound: 'File not found',

    // Rate Limiting
    tooManyRequests: 'Too many requests',

    // Server
    internalError: 'Internal server error',
    serviceUnavailable: 'Service temporarily unavailable',

    // Additional errors
    validationError: 'Data validation error',
    validationFailed: 'Validation failed',
    invalidId: 'Invalid ID',
    routeNotFound: 'Requested route not found',
    tooManyFiles: 'Too many files',
    fileUploadError: 'File upload error'
  }
};

/**
 * Get localized error message
 */
export const getErrorMessage = (key, language = 'fa', replacements = {}) => {
  let message = errorMessages[language]?.[key] || errorMessages.fa[key] || key;

  // Replace placeholders
  Object.keys(replacements).forEach(placeholder => {
    message = message.replace(`{${placeholder}}`, replacements[placeholder]);
  });

  return message;
};
