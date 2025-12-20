import Joi from 'joi';
import {
  slugSchema,
  multiLangStringSchema,
  categoryArraySchema,
  tagsSchema,
  objectIdArraySchema,
  seoSchema,
  booleanSchema
} from '../../shared/validations/baseValidation.js';

export const createVideoSchema = Joi.object({
  title: multiLangStringSchema({
    maxLength: 200,
    required: true,
    fieldName: 'عنوان'
  }),

  slug: slugSchema,

  description: multiLangStringSchema({
    maxLength: 2000,
    allowEmpty: true,
    fieldName: 'توضیحات'
  }),

  shortDescription: multiLangStringSchema({
    maxLength: 500,
    allowEmpty: true,
    fieldName: 'توضیحات کوتاه'
  }),

  videoUrl: Joi.string().uri().required(),

  thumbnailUrl: Joi.string().uri().required(),

  duration: Joi.number().min(0).required(),

  fileSize: Joi.number().min(0),

  quality: Joi.string().valid('360p', '480p', '720p', '1080p', '1440p', '2160p', 'auto').default('auto'),

  format: Joi.string().valid('mp4', 'webm', 'm3u8', 'other').default('mp4'),

  hlsUrl: Joi.string().uri().allow(''),

  dashUrl: Joi.string().uri().allow(''),

  categories: categoryArraySchema({
    minItems: 0,
    required: false
  }),

  tags: tagsSchema,

  relatedServices: objectIdArraySchema('خدمت'),

  relatedPortfolios: objectIdArraySchema('نمونه کار'),

  relatedArticles: objectIdArraySchema('مقاله'),

  isPublished: booleanSchema(false),

  isFeatured: booleanSchema(false),

  metadata: Joi.object({
    width: Joi.number(),
    height: Joi.number(),
    fps: Joi.number(),
    codec: Joi.string(),
    bitrate: Joi.number()
  }),

  seo: seoSchema.keys({
    ogImage: Joi.string().uri().allow('').optional()
  }),

  infoBox: Joi.object({
    title: Joi.object({
      fa: Joi.string().allow(''),
      en: Joi.string().allow('')
    }),
    content: Joi.object({
      fa: Joi.string().allow(''),
      en: Joi.string().allow('')
    }),
    isActive: Joi.boolean().default(false)
  }),

  transcript: Joi.object({
    fa: Joi.string().allow(''),
    en: Joi.string().allow('')
  }),

  subtitles: Joi.array().items(Joi.object({
    language: Joi.string().required(),
    url: Joi.string().uri().required(),
    label: Joi.string()
  })),

  chapters: Joi.array().items(Joi.object({
    title: Joi.object({
      fa: Joi.string().allow(''),
      en: Joi.string().allow('')
    }),
    startTime: Joi.number().min(0).required(),
    endTime: Joi.number().min(0)
  }))
});

export const updateVideoSchema = Joi.object({
  title: multiLangStringSchema({
    maxLength: 200,
    fieldName: 'عنوان'
  }),

  slug: slugSchema,

  description: multiLangStringSchema({
    maxLength: 2000,
    allowEmpty: true,
    fieldName: 'توضیحات'
  }),

  shortDescription: multiLangStringSchema({
    maxLength: 500,
    allowEmpty: true,
    fieldName: 'توضیحات کوتاه'
  }),

  videoUrl: Joi.string().uri(),

  thumbnailUrl: Joi.string().uri(),

  duration: Joi.number().min(0),

  fileSize: Joi.number().min(0),

  quality: Joi.string().valid('360p', '480p', '720p', '1080p', '1440p', '2160p', 'auto'),

  format: Joi.string().valid('mp4', 'webm', 'm3u8', 'other'),

  hlsUrl: Joi.string().uri().allow(''),

  dashUrl: Joi.string().uri().allow(''),

  categories: categoryArraySchema({
    minItems: 0,
    required: false
  }),

  tags: tagsSchema,

  relatedServices: objectIdArraySchema('خدمت'),

  relatedPortfolios: objectIdArraySchema('نمونه کار'),

  relatedArticles: objectIdArraySchema('مقاله'),

  isPublished: Joi.boolean().optional(),

  isFeatured: Joi.boolean().optional(),

  metadata: Joi.object({
    width: Joi.number(),
    height: Joi.number(),
    fps: Joi.number(),
    codec: Joi.string(),
    bitrate: Joi.number()
  }),

  seo: seoSchema.keys({
    ogImage: Joi.string().uri().allow('').optional()
  }),

  infoBox: Joi.object({
    title: Joi.object({
      fa: Joi.string().allow(''),
      en: Joi.string().allow('')
    }),
    content: Joi.object({
      fa: Joi.string().allow(''),
      en: Joi.string().allow('')
    }),
    isActive: Joi.boolean()
  }),

  transcript: Joi.object({
    fa: Joi.string().allow(''),
    en: Joi.string().allow('')
  }),

  subtitles: Joi.array().items(Joi.object({
    language: Joi.string().required(),
    url: Joi.string().uri().required(),
    label: Joi.string()
  })),

  chapters: Joi.array().items(Joi.object({
    title: Joi.object({
      fa: Joi.string().allow(''),
      en: Joi.string().allow('')
    }),
    startTime: Joi.number().min(0).required(),
    endTime: Joi.number().min(0)
  }))
});

