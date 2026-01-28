import Joi from 'joi';
import {
  slugSchema,
  multiLangStringSchema,
  categoryArraySchema,
  objectIdArraySchema,
  statusSchema
} from '../../shared/validations/baseValidation.js';

/**
 * Validation schemas for Product operations
 */

export const createProductSchema = Joi.object({
  name: multiLangStringSchema({
    minLength: 3,
    maxLength: 200,
    required: true,
    fieldName: 'نام محصول'
  }),

  slug: slugSchema,

  sku: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z0-9-]+$/)
    .max(50)
    .optional()
    .messages({
      'string.pattern.base': 'SKU فقط می‌تواند شامل حروف انگلیسی، اعداد و خط تیره باشد'
    }),

  type: Joi.string()
    .valid('digital', 'physical')
    .required()
    .messages({
      'any.only': 'نوع محصول باید digital یا physical باشد'
    }),

  // Digital product fields
  digitalProduct: Joi.object({
    contentType: Joi.string()
      .valid('article', 'file', 'course', 'ebook', 'software', 'other')
      .default('file'),
    downloadUrl: Joi.string().uri().optional(),
    downloadLimit: Joi.number().integer().min(0).allow(null).optional(),
    downloadExpiry: Joi.number().integer().min(0).allow(null).optional(),
    fileSize: Joi.number().min(0).optional(),
    fileType: Joi.string().optional()
  }).when('type', {
    is: 'digital',
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  }),

  // Physical product fields
  physicalProduct: Joi.object({
    weight: Joi.number().min(0).optional(),
    dimensions: Joi.object({
      length: Joi.number().min(0).optional(),
      width: Joi.number().min(0).optional(),
      height: Joi.number().min(0).optional()
    }).optional(),
    shippingClass: Joi.string()
      .valid('standard', 'express', 'fragile', 'heavy')
      .default('standard'),
    requiresShipping: Joi.boolean().default(true)
  }).when('type', {
    is: 'physical',
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  }),

  shortDescription: multiLangStringSchema({
    minLength: 10,
    maxLength: 500,
    required: false,
    fieldName: 'توضیحات کوتاه'
  }),

  description: multiLangStringSchema({
    minLength: 20,
    required: true,
    fieldName: 'توضیحات'
  }),

  fullDescription: multiLangStringSchema({
    required: false,
    fieldName: 'توضیحات کامل'
  }),

  featuredImage: Joi.string().uri().required()
    .messages({
      'any.required': 'تصویر شاخص الزامی است',
      'string.uri': 'آدرس تصویر معتبر نیست'
    }),

  gallery: Joi.array().items(
    Joi.object({
      url: Joi.string().uri().required(),
      alt: multiLangStringSchema({ required: false }),
      caption: multiLangStringSchema({ required: false }),
      order: Joi.number().integer().min(0).default(0)
    })
  ).optional(),

  videoUrl: Joi.string().uri().optional(),

  pricing: Joi.object({
    basePrice: Joi.number().min(0).required()
      .messages({
        'any.required': 'قیمت پایه الزامی است',
        'number.min': 'قیمت نمی‌تواند منفی باشد'
      }),
    compareAtPrice: Joi.number().min(0).optional(),
    currency: Joi.string().valid('IRR', 'USD', 'EUR').default('IRR'),
    isOnSale: Joi.boolean().default(false),
    salePrice: Joi.number().min(0).optional(),
    saleStartDate: Joi.date().optional(),
    saleEndDate: Joi.date().optional()
  }).required(),

  inventory: Joi.object({
    trackInventory: Joi.boolean().default(true),
    quantity: Joi.number().integer().min(0).default(0),
    lowStockThreshold: Joi.number().integer().min(0).default(10),
    allowBackorder: Joi.boolean().default(false)
  }).optional(),

  categories: categoryArraySchema,

  tags: Joi.object({
    fa: Joi.array().items(Joi.string().trim()).optional(),
    en: Joi.array().items(Joi.string().trim()).optional()
  }).optional(),

  specifications: Joi.array().items(
    Joi.object({
      name: multiLangStringSchema({ required: true }),
      value: multiLangStringSchema({ required: true }),
      group: multiLangStringSchema({ required: false })
    })
  ).optional(),

  suitableFor: Joi.object({
    fa: Joi.array().items(Joi.string().trim()).optional(),
    en: Joi.array().items(Joi.string().trim()).optional()
  }).optional(),

  seo: Joi.object({
    metaTitle: multiLangStringSchema({ required: false }),
    metaDescription: multiLangStringSchema({ required: false }),
    metaKeywords: Joi.object({
      fa: Joi.array().items(Joi.string().trim()).optional(),
      en: Joi.array().items(Joi.string().trim()).optional()
    }).optional(),
    ogImage: Joi.string().uri().optional()
  }).optional(),

  loyaltyPoints: Joi.object({
    earnOnPurchase: Joi.number().integer().min(0).default(0),
    requiredForDiscount: Joi.number().integer().min(0).allow(null).optional()
  }).optional(),

  // Related Content
  relatedProducts: objectIdArraySchema('محصول مرتبط', { minItems: 0, required: false }),
  relatedArticles: objectIdArraySchema('مقاله مرتبط', { minItems: 0, required: false }),
  relatedServices: objectIdArraySchema('خدمت مرتبط', { minItems: 0, required: false }),
  relatedVideos: objectIdArraySchema('ویدیو مرتبط', { minItems: 0, required: false }),

  // Vendor Information
  vendor: Joi.object({
    name: Joi.string().trim().max(200).optional(),
    contact: Joi.string().trim().max(200).optional()
  }).optional(),

  // Status and Publishing
  status: statusSchema,
  isPublished: Joi.boolean().default(false),
  isFeatured: Joi.boolean().default(false),
  orderIndex: Joi.number().integer().default(0)
});

export const updateProductSchema = createProductSchema.fork(
  ['name', 'slug', 'sku', 'type', 'featuredImage', 'pricing.basePrice'],
  (schema) => schema.optional()
);

export const subscribeToNotificationsSchema = Joi.object({
  channels: Joi.object({
    email: Joi.boolean().optional(),
    sms: Joi.boolean().optional(),
    web: Joi.boolean().optional()
  }).optional()
    .messages({
      'object.base': 'channels باید یک object باشد'
    })
});