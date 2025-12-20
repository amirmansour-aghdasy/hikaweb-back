import Joi from 'joi';
import {
  multiLangStringSchema
} from '../../shared/validations/baseValidation.js';

export const createBannerSchema = Joi.object({
  title: multiLangStringSchema({
    maxLength: 200,
    allowEmpty: true,
    fieldName: 'عنوان'
  }),

  description: multiLangStringSchema({
    allowEmpty: true,
    fieldName: 'توضیحات'
  }),

  image: Joi.string().required().messages({
    'any.required': 'تصویر دسکتاپ الزامی است'
  }),

  mobileImage: Joi.string().optional(),

  link: Joi.object({
    url: Joi.string()
      .required()
      .custom((value, helpers) => {
        // Accept absolute URLs (http://, https://)
        if (value.startsWith('http://') || value.startsWith('https://')) {
          try {
            new URL(value);
            return value;
          } catch {
            return helpers.error('string.uri');
          }
        }
        // Accept relative paths (starting with /)
        if (value.startsWith('/')) {
          return value;
        }
        // Accept relative paths without leading slash
        if (value.length > 0 && !value.includes(' ')) {
          return value;
        }
        return helpers.error('string.uri');
      })
      .messages({
        'any.required': 'لینک بنر الزامی است',
        'string.uri': 'لینک باید یک URL معتبر یا مسیر نسبی باشد'
      }),
    target: Joi.string().valid('_self', '_blank').default('_self'),
    text: Joi.object({
      fa: Joi.string().allow(''),
      en: Joi.string().allow('')
    }).optional()
  }).required(),

  position: Joi.string().valid('home-page-banners').default('home-page-banners'),

  orderIndex: Joi.number().default(0),

  isActive: Joi.boolean().default(true),

  schedule: Joi.object({
    startDate: Joi.date(),
    endDate: Joi.date(),
    isScheduled: Joi.boolean().default(false)
  }).optional(),

  settings: Joi.object({
    altText: Joi.object({
      fa: Joi.string().allow(''),
      en: Joi.string().allow('')
    }).optional(),
    showOnMobile: Joi.boolean().default(true),
    showOnDesktop: Joi.boolean().default(true)
  }).optional()
});

export const updateBannerSchema = createBannerSchema.fork(['image', 'link'], schema =>
  schema.optional()
);

export const updateOrderSchema = Joi.object({
  bannerIds: Joi.array().items(Joi.string().hex().length(24)).min(1).required()
});

