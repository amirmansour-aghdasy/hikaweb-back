import Joi from 'joi';

export const createArticleSchema = Joi.object({
  title: Joi.object({
    fa: Joi.string().required().trim().min(5).max(200).messages({
      'string.min': 'عنوان فارسی باید حداقل ۵ کاراکتر باشد',
      'string.max': 'عنوان فارسی نمی‌تواند بیش از ۲۰۰ کاراکتر باشد',
      'any.required': 'عنوان فارسی الزامی است'
    }),
    en: Joi.string().required().trim().min(5).max(200).messages({
      'string.min': 'عنوان انگلیسی باید حداقل ۵ کاراکتر باشد',
      'any.required': 'عنوان انگلیسی الزامی است'
    })
  }).required(),

  slug: Joi.object({
    fa: Joi.string()
      .required()
      .trim()
      .lowercase()
      .pattern(/^[a-z0-9-]+$/)
      .messages({
        'string.pattern.base': 'آدرس یکتا فارسی فقط می‌تواند شامل حروف کوچک، اعداد و خط تیره باشد',
        'any.required': 'آدرس یکتا فارسی الزامی است'
      }),
    en: Joi.string()
      .required()
      .trim()
      .lowercase()
      .pattern(/^[a-z0-9-]+$/)
      .messages({
        'string.pattern.base':
          'آدرس یکتا انگلیسی فقط می‌تواند شامل حروف کوچک، اعداد و خط تیره باشد',
        'any.required': 'آدرس یکتا انگلیسی الزامی است'
      })
  }).required(),

  excerpt: Joi.object({
    fa: Joi.string().allow('').max(500),
    en: Joi.string().allow('').max(500)
  }).optional(),

  content: Joi.object({
    fa: Joi.string().required().min(50).messages({
      'string.min': 'محتوای فارسی باید حداقل ۵۰ کاراکتر باشد',
      'any.required': 'محتوای فارسی الزامی است'
    }),
    en: Joi.string().required().min(50).messages({
      'string.min': 'محتوای انگلیسی باید حداقل ۵۰ کاراکتر باشد',
      'any.required': 'محتوای انگلیسی الزامی است'
    })
  }).required(),

  featuredImage: Joi.string().optional(),

  categories: Joi.array()
    .items(
      Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
          'string.pattern.base': 'شناسه دسته‌بندی نامعتبر است'
        })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'حداقل یک دسته‌بندی باید انتخاب شود',
      'any.required': 'دسته‌بندی الزامی است'
    }),

  tags: Joi.object({
    fa: Joi.array().items(Joi.string().trim()).optional(),
    en: Joi.array().items(Joi.string().trim()).optional()
  }).optional(),

  isPublished: Joi.boolean().default(false),
  isFeatured: Joi.boolean().default(false),

  seo: Joi.object({
    metaTitle: Joi.object({
      fa: Joi.string().max(60),
      en: Joi.string().max(60)
    }).optional(),
    metaDescription: Joi.object({
      fa: Joi.string().max(160),
      en: Joi.string().max(160)
    }).optional(),
    metaKeywords: Joi.object({
      fa: Joi.array().items(Joi.string()),
      en: Joi.array().items(Joi.string())
    }).optional()
  }).optional()
});

export const updateArticleSchema = createArticleSchema.fork(
  ['title', 'slug', 'content', 'categories'],
  schema => schema.optional()
);

export const publishArticleSchema = Joi.object({
  isPublished: Joi.boolean().required()
});
