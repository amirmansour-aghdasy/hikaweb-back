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
      .lowercase()
      .pattern(/^[a-z0-9-]+$/),
    en: Joi.string()
      .required()
      .lowercase()
      .pattern(/^[a-z0-9-]+$/)
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
