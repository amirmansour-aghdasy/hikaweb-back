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

  introVideo: Joi.object({
    url: Joi.string().uri().allow('').optional(),
    thumbnailUrl: Joi.string().uri().allow('').optional(),
    duration: Joi.number().min(0).optional(),
    fileSize: Joi.number().min(0).optional(),
    format: Joi.string().valid('mp4', 'webm', 'm3u8').default('mp4').optional()
  }).optional(),

  categories: categoryArraySchema({
    minItems: 1,
    required: true
  }),

  tags: tagsSchema,

  isPublished: booleanSchema(false),
  isFeatured: booleanSchema(false),
  isPremium: booleanSchema(false),
  relatedProduct: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).allow(null).optional()
    .messages({
      'string.pattern.base': 'شناسه محصول معتبر نیست'
    }),

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
  }).optional(),

  digitalContent: Joi.object({
    mainPdf: Joi.object({
      url: Joi.string().uri().allow('').optional(),
      fileName: Joi.string().allow('').optional(),
      fileSize: Joi.number().min(0).optional(),
      mimeType: Joi.string().default('application/pdf').optional()
    }).optional(),
    videos: Joi.array().items(
      Joi.object({
        title: Joi.object({
          fa: Joi.string().allow('').optional(),
          en: Joi.string().allow('').optional()
        }).optional(),
        url: Joi.string().uri().required(),
        thumbnailUrl: Joi.string().uri().allow('').optional(),
        duration: Joi.number().min(0).optional(),
        fileSize: Joi.number().min(0).optional(),
        format: Joi.string().valid('mp4', 'webm', 'm3u8').default('mp4').optional(),
        order: Joi.number().default(0).optional()
      })
    ).optional(),
    attachments: Joi.array().items(
      Joi.object({
        title: Joi.object({
          fa: Joi.string().allow('').optional(),
          en: Joi.string().allow('').optional()
        }).optional(),
        url: Joi.string().uri().required(),
        fileName: Joi.string().allow('').optional(),
        fileSize: Joi.number().min(0).optional(),
        mimeType: Joi.string().default('application/pdf').optional(),
        order: Joi.number().default(0).optional()
      })
    ).optional()
  }).optional()
});

export const updateArticleSchema = createArticleSchema.fork(
  ['title', 'slug', 'content', 'categories'],
  schema => schema.optional()
);

export const publishArticleSchema = Joi.object({
  isPublished: Joi.boolean().required()
});
