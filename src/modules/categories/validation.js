import Joi from 'joi';

export const createCategorySchema = Joi.object({
  name: Joi.object({
    fa: Joi.string().required().trim().min(2).max(100).messages({
      'any.required': 'نام فارسی دسته‌بندی الزامی است'
    }),
    en: Joi.string().required().trim().min(2).max(100).messages({
      'any.required': 'نام انگلیسی دسته‌بندی الزامی است'
    })
  }).required(),

  slug: Joi.object({
    fa: Joi.string()
      .required()
      .trim()
      .pattern(/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-z0-9-]+$/)
      .messages({
        'string.pattern.base': 'آدرس یکتا فارسی فقط می‌تواند شامل حروف فارسی، حروف انگلیسی کوچک، اعداد و خط تیره باشد'
      }),
    en: Joi.string()
      .required()
      .trim()
      .lowercase()
      .pattern(/^[a-z0-9-]+$/)
      .messages({
        'string.pattern.base': 'آدرس یکتا انگلیسی فقط می‌تواند شامل حروف کوچک، اعداد و خط تیره باشد'
      })
  }).required(),

  description: Joi.object({
    fa: Joi.string().allow(''),
    en: Joi.string().allow('')
  }).optional(),

  parent: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow(null)
    .optional(),

  type: Joi.string().required().valid('article', 'service', 'portfolio', 'faq').messages({
    'any.required': 'نوع دسته‌بندی الزامی است'
  }),

  icon: Joi.string().optional(),
  color: Joi.string()
    .pattern(/^#[0-9A-F]{6}$/i)
    .default('#000000'),
  orderIndex: Joi.number().default(0)
});

export const updateCategorySchema = createCategorySchema.fork(['name', 'slug', 'type'], schema =>
  schema.optional()
);
