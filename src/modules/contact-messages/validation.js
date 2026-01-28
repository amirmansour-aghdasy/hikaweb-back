import Joi from 'joi';

// Improved phone number pattern matching Iranian mobile prefixes
const phonePattern = /^(09)(10|11|12|13|14|15|16|17|18|19|90|91|92|93|94|30|33|35|36|37|38|39|00|01|02|03|04|05|41|42|20|21|22|32|31|34)\d{7}$/;

export const createContactMessageSchema = Joi.object({
  fullName: Joi.string().required().trim().min(2).max(100).messages({
    'any.required': 'نام و نام خانوادگی الزامی است',
    'string.min': 'نام باید حداقل ۲ کاراکتر باشد',
    'string.max': 'نام نمی‌تواند بیش از ۱۰۰ کاراکتر باشد'
  }),

  email: Joi.string()
    .optional()
    .allow('', null)
    .email()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'فرمت ایمیل صحیح نیست'
    }),

  phoneNumber: Joi.string()
    .required()
    .pattern(phonePattern)
    .messages({
      'any.required': 'شماره موبایل الزامی است',
      'string.pattern.base': 'شماره موبایل صحیح نیست. لطفاً شماره معتبر وارد کنید (مثال: 09123456789)'
    }),

  message: Joi.string()
    .optional()
    .allow('', null)
    .trim()
    .min(10)
    .max(2000)
    .messages({
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

