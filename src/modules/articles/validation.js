import Joi from 'joi';
import {
  slugSchema,
  multiLangStringSchema,
  categoryArraySchema,
  seoSchema,
  tagsSchema,
  booleanSchema
} from '../../shared/validations/baseValidation.js';

export const createArticleSchema = Joi.object({
  title: multiLangStringSchema({
    minLength: 5,
    maxLength: 200,
    required: true,
    fieldName: 'عنوان'
  }),

  slug: slugSchema,

  excerpt: multiLangStringSchema({
    maxLength: 500,
    allowEmpty: true,
    fieldName: 'خلاصه'
  }),

  content: multiLangStringSchema({
    minLength: 50,
    required: true,
    fieldName: 'محتوا'
  }),

  featuredImage: Joi.string().optional(),

  categories: categoryArraySchema({
    minItems: 1,
    required: true
  }),

  tags: tagsSchema,

  isPublished: booleanSchema(false),
  isFeatured: booleanSchema(false),

  seo: seoSchema,

  downloadBox: Joi.object({
    title: Joi.object({
      fa: Joi.string().allow('').max(200),
      en: Joi.string().allow('').max(200)
    }).optional(),
    description: Joi.object({
      fa: Joi.string().allow('').max(500),
      en: Joi.string().allow('').max(500)
    }).optional(),
    fileUrl: Joi.string().uri().allow('').optional(),
    fileName: Joi.string().allow('').optional(),
    fileSize: Joi.number().min(0).optional(),
    fileType: Joi.string().allow('').optional(),
    isActive: Joi.boolean().default(false)
  }).optional()
});

export const updateArticleSchema = createArticleSchema.fork(
  ['title', 'slug', 'content', 'categories'],
  schema => schema.optional()
);

export const publishArticleSchema = Joi.object({
  isPublished: Joi.boolean().required()
});
