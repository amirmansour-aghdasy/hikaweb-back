import Joi from 'joi';

export const createShortLinkSchema = Joi.object({
  originalUrl: Joi.string()
    .uri()
    .required()
    .messages({
      'string.uri': 'آدرس اصلی باید یک URL معتبر باشد',
      'any.required': 'آدرس اصلی الزامی است'
    }),
  resourceType: Joi.string()
    .valid('article', 'service', 'portfolio', 'category', 'other')
    .default('other'),
  resourceId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow(null)
    .default(null),
  shortCode: Joi.string()
    .pattern(/^[a-z0-9_-]+$/)
    .min(3)
    .max(20)
    .optional()
    .messages({
      'string.pattern.base': 'کد کوتاه فقط می‌تواند شامل حروف انگلیسی، اعداد، خط تیره و زیرخط باشد',
      'string.min': 'کد کوتاه باید حداقل 3 کاراکتر باشد',
      'string.max': 'کد کوتاه باید حداکثر 20 کاراکتر باشد'
    }),
  expiresAt: Joi.date()
    .greater('now')
    .allow(null)
    .optional(),
  metadata: Joi.object({
    title: Joi.object({
      fa: Joi.string().allow('').optional(),
      en: Joi.string().allow('').optional()
    }).optional(),
    description: Joi.object({
      fa: Joi.string().allow('').optional(),
      en: Joi.string().allow('').optional()
    }).optional()
  }).optional()
});

export const updateShortLinkSchema = Joi.object({
  originalUrl: Joi.string()
    .uri()
    .optional(),
  isActive: Joi.boolean().optional(),
  expiresAt: Joi.date()
    .greater('now')
    .allow(null)
    .optional(),
  metadata: Joi.object({
    title: Joi.object({
      fa: Joi.string().allow('').optional(),
      en: Joi.string().allow('').optional()
    }).optional(),
    description: Joi.object({
      fa: Joi.string().allow('').optional(),
      en: Joi.string().allow('').optional()
    }).optional()
  }).optional()
});

