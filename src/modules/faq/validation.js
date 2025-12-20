import Joi from 'joi';
import {
  multiLangStringSchema,
  objectIdSchema,
  objectIdArraySchema
} from '../../shared/validations/baseValidation.js';

export const createFAQSchema = Joi.object({
  question: multiLangStringSchema({
    required: true,
    fieldName: 'سوال'
  }),

  answer: multiLangStringSchema({
    required: true,
    fieldName: 'پاسخ'
  }),

  serviceId: objectIdSchema('خدمت')
    .optional(),

  categoryIds: objectIdArraySchema('دسته‌بندی'),

  tags: Joi.array().items(Joi.string()).optional(),

  orderIndex: Joi.number().default(0),

  isPublic: Joi.boolean().default(true),

  status: Joi.string().valid('active', 'inactive', 'archived').default('active')
});

export const updateFAQSchema = createFAQSchema.fork(['question', 'answer'], schema =>
  schema.optional()
);
