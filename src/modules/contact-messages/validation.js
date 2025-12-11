import Joi from 'joi';

export const createContactMessageSchema = Joi.object({
  fullName: Joi.string().required().trim().min(2).max(100).messages({
    'any.required': 'نام و نام خانوادگی الزامی است',
    'string.min': 'نام باید حداقل ۲ کاراکتر باشد',
    'string.max': 'نام نمی‌تواند بیش از ۱۰۰ کاراکتر باشد'
  }),

  email: Joi.string().required().email().lowercase().trim().messages({
    'any.required': 'ایمیل الزامی است',
    'string.email': 'فرمت ایمیل صحیح نیست'
  }),

  phoneNumber: Joi.string()
    .required()
    .pattern(/^(\+98|0)?9\d{9}$/)
    .messages({
      'any.required': 'شماره موبایل الزامی است',
      'string.pattern.base': 'شماره موبایل صحیح نیست'
    }),

  message: Joi.string().required().trim().min(10).max(2000).messages({
    'any.required': 'پیام الزامی است',
    'string.min': 'پیام باید حداقل ۱۰ کاراکتر باشد',
    'string.max': 'پیام نمی‌تواند بیش از ۲۰۰۰ کاراکتر باشد'
  }),

  leadSource: Joi.string()
    .valid('website', 'referral', 'social_media', 'google_ads', 'direct', 'other')
    .default('website'),

  utmParams: Joi.object({
    source: Joi.string(),
    medium: Joi.string(),
    campaign: Joi.string(),
    term: Joi.string(),
    content: Joi.string()
  }).optional()
});

export const updateContactMessageSchema = Joi.object({
  status: Joi.string()
    .valid('new', 'read', 'archived')
    .optional(),

  internalNotes: Joi.array()
    .items(
      Joi.object({
        note: Joi.string().required(),
        author: Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
      })
    )
    .optional()
});

// Reply functionality removed - use ticket system instead

