import Joi from 'joi';

export const createPortfolioSchema = Joi.object({
  title: Joi.object({
    fa: Joi.string().required().trim().min(5).max(200).messages({
      'any.required': 'عنوان فارسی الزامی است',
      'string.min': 'عنوان باید حداقل ۵ کاراکتر باشد'
    }),
    en: Joi.string().required().trim().min(5).max(200).messages({
      'any.required': 'عنوان انگلیسی الزامی است'
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

  client: Joi.object({
    name: Joi.string().required().trim().max(100).messages({
      'any.required': 'نام مشتری الزامی است'
    }),
    logo: Joi.string().optional(),
    website: Joi.string().uri().optional(),
    industry: Joi.object({
      fa: Joi.string(),
      en: Joi.string()
    }).optional(),
    size: Joi.string().valid('startup', 'small', 'medium', 'large', 'enterprise').optional()
  }).required(),

  project: Joi.object({
    duration: Joi.number().required().min(1).messages({
      'any.required': 'مدت زمان پروژه الزامی است',
      'number.min': 'مدت زمان باید حداقل ۱ روز باشد'
    }),
    budget: Joi.string().valid('under-1m', '1m-5m', '5m-10m', '10m-50m', 'over-50m').optional(),
    completedAt: Joi.date().required().messages({
      'any.required': 'تاریخ تکمیل پروژه الزامی است'
    }),
    projectType: Joi.object({
      fa: Joi.string(),
      en: Joi.string()
    }).optional()
  }).required(),

  services: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .required()
    .messages({
      'array.min': 'حداقل یک خدمت باید انتخاب شود'
    }),

  categories: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .optional(),

  toolsUsed: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        icon: Joi.string().optional(),
        category: Joi.string().optional()
      })
    )
    .optional(),

  featuredImage: Joi.string().required().messages({
    'any.required': 'تصویر اصلی الزامی است'
  }),

  gallery: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().required(),
        type: Joi.string().valid('image', 'video').default('image'),
        alt: Joi.object({
          fa: Joi.string(),
          en: Joi.string()
        }),
        caption: Joi.object({
          fa: Joi.string(),
          en: Joi.string()
        }),
        order: Joi.number().default(0)
      })
    )
    .optional(),

  results: Joi.array()
    .items(
      Joi.object({
        metric: Joi.object({
          fa: Joi.string().required(),
          en: Joi.string().required()
        }).required(),
        value: Joi.string().required(),
        improvement: Joi.string().optional(),
        icon: Joi.string().optional()
      })
    )
    .optional(),

  testimonial: Joi.object({
    content: Joi.object({
      fa: Joi.string(),
      en: Joi.string()
    }),
    clientName: Joi.string(),
    clientPosition: Joi.string(),
    clientAvatar: Joi.string(),
    rating: Joi.number().min(1).max(5)
  }).optional(),

  challenges: Joi.array()
    .items(
      Joi.object({
        title: Joi.object({
          fa: Joi.string(),
          en: Joi.string()
        }),
        description: Joi.object({
          fa: Joi.string(),
          en: Joi.string()
        }),
        solution: Joi.object({
          fa: Joi.string(),
          en: Joi.string()
        })
      })
    )
    .optional(),

  orderIndex: Joi.number().default(0),
  isFeatured: Joi.boolean().default(false),

  seo: Joi.object({
    metaTitle: Joi.object({
      fa: Joi.string().max(60),
      en: Joi.string().max(60)
    }),
    metaDescription: Joi.object({
      fa: Joi.string().max(160),
      en: Joi.string().max(160)
    }),
    metaKeywords: Joi.object({
      fa: Joi.array().items(Joi.string()),
      en: Joi.array().items(Joi.string())
    }),
    ogImage: Joi.string()
  }).optional()
});

export const updatePortfolioSchema = createPortfolioSchema.fork(
  ['title', 'slug', 'description', 'client', 'project', 'services', 'featuredImage'],
  schema => schema.optional()
);
