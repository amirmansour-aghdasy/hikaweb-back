import Joi from 'joi';
import {
  slugSchema,
  multiLangStringSchema,
  categoryArraySchema
} from '../../shared/validations/baseValidation.js';

export const createServiceSchema = Joi.object({
  name: multiLangStringSchema({
    minLength: 3,
    maxLength: 200,
    required: true,
    fieldName: 'نام خدمت'
  }),

  slug: slugSchema,

  description: multiLangStringSchema({
    minLength: 50,
    required: true,
    fieldName: 'توضیحات'
  }),

  shortDescription: multiLangStringSchema({
    maxLength: 300,
    fieldName: 'توضیحات کوتاه'
  }),

  icon: Joi.string().optional(),
  featuredImage: Joi.string().optional(),

  categories: categoryArraySchema({
    minItems: 1,
    required: true
  }),

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
