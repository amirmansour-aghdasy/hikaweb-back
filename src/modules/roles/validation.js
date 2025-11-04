import Joi from 'joi';

export const createRoleSchema = Joi.object({
  name: Joi.string().required().trim().messages({
    'string.empty': 'نام نقش الزامی است',
    'any.required': 'نام نقش الزامی است'
  }),
  
  displayName: Joi.object({
    fa: Joi.string().required().messages({
      'string.empty': 'نام نمایشی فارسی الزامی است',
      'any.required': 'نام نمایشی فارسی الزامی است'
    }),
    en: Joi.string().required().messages({
      'string.empty': 'نام نمایشی انگلیسی الزامی است',
      'any.required': 'نام نمایشی انگلیسی الزامی است'
    })
  }).required(),
  
  description: Joi.object({
    fa: Joi.string().allow(''),
    en: Joi.string().allow('')
  }).optional(),
  
  permissions: Joi.array().items(Joi.string()).default([]),
  
  priority: Joi.number().integer().min(0).default(0),
  
  isSystem: Joi.boolean().default(false)
});

export const updateRoleSchema = Joi.object({
  name: Joi.string().trim(),
  
  displayName: Joi.object({
    fa: Joi.string(),
    en: Joi.string()
  }),
  
  description: Joi.object({
    fa: Joi.string().allow(''),
    en: Joi.string().allow('')
  }),
  
  permissions: Joi.array().items(Joi.string()),
  
  priority: Joi.number().integer().min(0),
  
  isSystem: Joi.boolean(),
  
  status: Joi.string().valid('active', 'inactive')
});

