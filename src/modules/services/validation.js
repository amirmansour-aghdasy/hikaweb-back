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
      .trim()
      .pattern(/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-z0-9-]+$/)
      .messages({
        'string.pattern.base': 'آدرس یکتا فارسی فقط می‌تواند شامل حروف فارسی، حروف انگلیسی کوچک، اعداد و خط تیره باشد'
      }),
    en: Joi.string()
      .required()
      .lowercase()
      .trim()
      .pattern(/^[a-z0-9-]+$/)
      .messages({
        'string.pattern.base': 'آدرس یکتا انگلیسی فقط می‌تواند شامل حروف کوچک، اعداد و خط تیره باشد'
      })
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
          value: Joi.string().required(), // Display value as string
          subTitle: Joi.object({
            fa: Joi.string(),
            en: Joi.string()
          }).optional(),
          features: Joi.array()
            .items(Joi.string()) // Array of strings
            .optional(),
          desc: Joi.object({
            fa: Joi.string(),
            en: Joi.string()
          }).optional(),
          actionBtnText: Joi.object({
            fa: Joi.string(),
            en: Joi.string()
          }).optional(),
          duration: Joi.string().optional(),
          isPopular: Joi.boolean().default(false)
        })
      )
      .optional()
  }).optional(),

  processSteps: Joi.array()
    .items(
      Joi.object({
        title: Joi.string().required(), // String for display
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

  subServices: Joi.array()
    .items(
      Joi.object({
        icon: Joi.string().required(),
        title: Joi.object({
          fa: Joi.string().required(),
          en: Joi.string().required()
        }).required()
      })
    )
    .optional(),

  mainContent: Joi.object({
    firstSection: Joi.object({
      content: Joi.object({
        title: Joi.object({
          fa: Joi.string().required(),
          en: Joi.string().required()
        }).required(),
        description: Joi.object({
          fa: Joi.string().required(),
          en: Joi.string().required()
        }).required(),
        actionBtnText: Joi.object({
          fa: Joi.string().required(),
          en: Joi.string().required()
        }).required()
      }).required(),
      slides: Joi.array()
        .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)) // Portfolio ObjectIds
        .optional()
    }).optional(),
    secondSection: Joi.object({
      content: Joi.object({
        title: Joi.object({
          fa: Joi.string().required(),
          en: Joi.string().required()
        }).required(),
        description: Joi.object({
          fa: Joi.string().required(),
          en: Joi.string().required()
        }).required(),
        actionBtnText: Joi.object({
          fa: Joi.string().required(),
          en: Joi.string().required()
        }).required()
      }).required(),
      slides: Joi.array()
        .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)) // Portfolio ObjectIds
        .optional()
    }).optional()
  }).optional(),

  finalDesc: Joi.object({
    content: Joi.object({
      title: Joi.object({
        fa: Joi.string().required(),
        en: Joi.string().required()
      }).required(),
      text: Joi.object({
        fa: Joi.string().required(),
        en: Joi.string().required()
      }).required()
    }).required(),
    image: Joi.string().required()
  }).optional(),

  isPopular: Joi.boolean().default(false),
  orderIndex: Joi.number().default(0)
});

export const updateServiceSchema = createServiceSchema.fork(
  ['name', 'slug', 'description', 'categories'],
  schema => schema.optional()
);
