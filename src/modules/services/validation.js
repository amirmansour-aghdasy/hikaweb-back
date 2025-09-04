import Joi from 'joi';

export const createServiceSchema = Joi.object({
  name: Joi.object({
    fa: Joi.string().required().trim().min(3).max(200).messages({
      'any.required': 'نام فارسی خدمت الزامی است',
      'string.min': 'نام خدمت باید حداقل ۳ کاراکتر باشد'
    }),
    en: Joi.string().required().trim().min(3).max(200).messages({
      'any.required': 'نام انگلیسی خدمت الزامی است'
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
    fa: Joi.string().required().min(50),
    en: Joi.string().required().min(50)
  }).required(),

  shortDescription: Joi.object({
    fa: Joi.string().max(300),
    en: Joi.string().max(300)
  }).optional(),

  icon: Joi.string().optional(),
  featuredImage: Joi.string().optional(),

  categories: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .required(),

  pricing: Joi.object({
    startingPrice: Joi.number().min(0).optional(),
    currency: Joi.string().valid('IRR', 'USD', 'EUR').default('IRR'),
    isCustom: Joi.boolean().default(false),
    packages: Joi.array()
      .items(
        Joi.object({
          name: Joi.object({
            fa: Joi.string().required(),
            en: Joi.string().required()
          }).required(),
          price: Joi.number().min(0).required(),
          features: Joi.array()
            .items(
              Joi.object({
                fa: Joi.string().required(),
                en: Joi.string().required()
              })
            )
            .optional(),
          duration: Joi.string().optional(),
          isPopular: Joi.boolean().default(false)
        })
      )
      .optional()
  }).optional(),

  processSteps: Joi.array()
    .items(
      Joi.object({
        title: Joi.object({
          fa: Joi.string().required(),
          en: Joi.string().required()
        }).required(),
        description: Joi.object({
          fa: Joi.string(),
          en: Joi.string()
        }).optional(),
        icon: Joi.string().optional(),
        order: Joi.number().required()
      })
    )
    .optional(),

  features: Joi.array()
    .items(
      Joi.object({
        title: Joi.object({
          fa: Joi.string().required(),
          en: Joi.string().required()
        }).required(),
        description: Joi.object({
          fa: Joi.string(),
          en: Joi.string()
        }).optional(),
        icon: Joi.string().optional()
      })
    )
    .optional(),

  isPopular: Joi.boolean().default(false),
  orderIndex: Joi.number().default(0)
});

export const updateServiceSchema = createServiceSchema.fork(
  ['name', 'slug', 'description', 'categories'],
  schema => schema.optional()
);
