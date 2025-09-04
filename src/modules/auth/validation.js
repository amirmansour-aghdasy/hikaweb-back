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

  mobile: Joi.string()
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
  mobile: Joi.string()
    .pattern(/^(\+98|0)?9\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': 'شماره موبایل صحیح نیست',
      'any.required': 'شماره موبایل الزامی است'
    })
});

export const otpVerifySchema = Joi.object({
  mobile: Joi.string()
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