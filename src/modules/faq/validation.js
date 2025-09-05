import Joi from 'joi';

export const createFAQSchema = Joi.object({
  question: Joi.object({
    fa: Joi.string().required(),
    en: Joi.string().required()
  }).required(),

  answer: Joi.object({
    fa: Joi.string().required(),
    en: Joi.string().required()
  }).required(),

  serviceId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional(),

  categoryIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .optional(),

  tags: Joi.array().items(Joi.string()).optional(),

  orderIndex: Joi.number().default(0),

  isPublic: Joi.boolean().default(true),

  status: Joi.string().valid('active', 'inactive', 'archived').default('active')
});

export const updateFAQSchema = createFAQSchema.fork(['question', 'answer'], schema =>
  schema.optional()
);
