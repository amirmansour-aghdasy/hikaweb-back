import Joi from 'joi';

export const createCarouselSchema = Joi.object({
  title: Joi.object({
    fa: Joi.string().required().trim().min(3).max(200).messages({
      'any.required': 'عنوان فارسی الزامی است'
    }),
    en: Joi.string().required().trim().min(3).max(200).messages({
      'any.required': 'عنوان انگلیسی الزامی است'
    })
  }).required(),

  subtitle: Joi.object({
    fa: Joi.string().allow(''),
    en: Joi.string().allow('')
  }).optional(),

  description: Joi.object({
    fa: Joi.string().allow(''),
    en: Joi.string().allow('')
  }).optional(),

  image: Joi.string().required().messages({
    'any.required': 'تصویر اسلاید الزامی است'
  }),

  mobileImage: Joi.string().optional(),

  link: Joi.object({
    url: Joi.string().uri(),
    text: Joi.object({
      fa: Joi.string(),
      en: Joi.string()
    }),
    target: Joi.string().valid('_self', '_blank').default('_self')
  }).optional(),

  button: Joi.object({
    text: Joi.object({
      fa: Joi.string(),
      en: Joi.string()
    }),
    url: Joi.string().uri(),
    style: Joi.string().valid('primary', 'secondary', 'outline', 'ghost').default('primary'),
    target: Joi.string().valid('_self', '_blank').default('_self')
  }).optional(),

  position: Joi.string().valid('home', 'services', 'portfolio', 'about').default('home'),

  orderIndex: Joi.number().default(0),

  isVisible: Joi.boolean().default(true),

  displaySettings: Joi.object({
    showOverlay: Joi.boolean().default(true),
    overlayOpacity: Joi.number().min(0).max(1).default(0.5),
    textPosition: Joi.string().valid('left', 'center', 'right').default('left'),
    textColor: Joi.string().default('#ffffff')
  }).optional(),

  schedule: Joi.object({
    startDate: Joi.date(),
    endDate: Joi.date(),
    isScheduled: Joi.boolean().default(false)
  }).optional()
});

export const updateCarouselSchema = createCarouselSchema.fork(['title', 'image'], schema =>
  schema.optional()
);
