import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'نام باید حداقل ۲ کاراکتر باشد',
      'any.required': 'نام الزامی است'
    }),

  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'فرمت ایمیل صحیح نیست',
      'any.required': 'ایمیل الزامی است'
    }),

    phoneNumber: Joi.string()
    .pattern(/^(\+98|0)?9\d{9}$/)
    .optional()
    .messages({
      'string.pattern.base': 'شماره موبایل صحیح نیست'
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'رمز عبور باید حداقل ۸ کاراکتر باشد',
      'string.pattern.base': 'رمز عبور باید شامل حروف کوچک، بزرگ و عدد باشد',
      'any.required': 'رمز عبور الزامی است'
    }),

  language: Joi.string()
    .valid('fa', 'en')
    .default('fa')
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required(),

  password: Joi.string()
    .required(),

  rememberMe: Joi.boolean()
    .default(false)
});

export const otpRequestSchema = Joi.object({
    phoneNumber: Joi.string()
    .pattern(/^(\+98|0)?9\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': 'شماره موبایل صحیح نیست',
      'any.required': 'شماره موبایل الزامی است'
    })
});

export const otpVerifySchema = Joi.object({
    phoneNumber: Joi.string()
    .pattern(/^(\+98|0)?9\d{9}$/)
    .required(),

  otp: Joi.string()
    .length(6)
    .pattern(/^\d+$/)
    .required()
    .messages({
      'string.length': 'کد تایید باید ۶ رقم باشد',
      'string.pattern.base': 'کد تایید باید عددی باشد',
      'any.required': 'کد تایید الزامی است'
    })
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token الزامی است'
    })
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'رمز عبور فعلی الزامی است'
    }),

  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'رمز عبور جدید باید حداقل ۸ کاراکتر باشد',
      'string.pattern.base': 'رمز عبور جدید باید شامل حروف کوچک، بزرگ و عدد باشد',
      'any.required': 'رمز عبور جدید الزامی است'
    })
});

export const googleAuthSchema = Joi.object({
  idToken: Joi.string()
    .required()
    .messages({
      'any.required': 'توکن Google الزامی است'
    })
});

export const dashboardOTPRequestSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .optional()
    .messages({
      'string.email': 'فرمت ایمیل صحیح نیست'
    }),
  phoneNumber: Joi.string()
    .pattern(/^(\+98|0)?9\d{9}$/)
    .optional()
    .messages({
      'string.pattern.base': 'شماره موبایل صحیح نیست'
    })
}).or('email', 'phoneNumber').messages({
  'object.missing': 'ایمیل یا شماره موبایل الزامی است'
});

export const dashboardOTPVerifySchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .optional(),
  phoneNumber: Joi.string()
    .pattern(/^(\+98|0)?9\d{9}$/)
    .optional()
    .messages({
      'string.pattern.base': 'شماره موبایل صحیح نیست'
    }),
  otp: Joi.string()
    .length(6)
    .pattern(/^\d+$/)
    .required()
    .messages({
      'string.length': 'کد تایید باید ۶ رقم باشد',
      'string.pattern.base': 'کد تایید باید عددی باشد',
      'any.required': 'کد تایید الزامی است'
    })
}).or('email', 'phoneNumber').messages({
  'object.missing': 'ایمیل یا شماره موبایل الزامی است'
});

export const passwordResetRequestSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'فرمت ایمیل صحیح نیست',
      'any.required': 'ایمیل الزامی است'
    })
});

export const passwordResetSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'توکن بازنشانی الزامی است'
    }),
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'رمز عبور جدید باید حداقل ۸ کاراکتر باشد',
      'string.pattern.base': 'رمز عبور جدید باید شامل حروف کوچک، بزرگ و عدد باشد',
      'any.required': 'رمز عبور جدید الزامی است'
    })
});

export const updateProfileSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'نام باید حداقل ۲ کاراکتر باشد',
      'string.max': 'نام نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد'
    }),

  phoneNumber: Joi.string()
    .pattern(/^(\+98|0)?9\d{9}$/)
    .allow(null, '')
    .optional()
    .messages({
      'string.pattern.base': 'شماره موبایل صحیح نیست'
    }),

  avatar: Joi.string()
    .uri()
    .allow(null, '')
    .optional()
    .messages({
      'string.uri': 'آدرس تصویر پروفایل صحیح نیست'
    }),

  language: Joi.string()
    .valid('fa', 'en')
    .optional()
});