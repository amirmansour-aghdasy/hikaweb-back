import Joi from 'joi';
import {
  slugSchema,
  multiLangStringSchema,
  objectIdSchema
} from '../../shared/validations/baseValidation.js';

export const createCategorySchema = Joi.object({
  name: multiLangStringSchema({
    minLength: 2,
    maxLength: 100,
    required: true,
    fieldName: 'نام دسته‌بندی'
  }),

  slug: slugSchema,

  description: multiLangStringSchema({
    allowEmpty: true,
    fieldName: 'توضیحات'
  }),

  parent: objectIdSchema('دسته‌بندی والد')
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

export const updateCategorySchema = createCategorySchema
  .fork(['name', 'slug', 'type'], schema => schema.optional())
  .keys({
    status: Joi.string().valid('active', 'inactive', 'archived').optional()
  });
