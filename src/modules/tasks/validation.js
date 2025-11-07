import Joi from 'joi';

export const createTaskSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.min': 'عنوان باید حداقل ۳ کاراکتر باشد',
      'string.max': 'عنوان باید حداکثر ۲۰۰ کاراکتر باشد',
      'any.required': 'عنوان الزامی است'
    }),

  description: Joi.string()
    .trim()
    .max(2000)
    .optional()
    .allow(''),

  assignee: Joi.string()
    .required()
    .messages({
      'any.required': 'کاربر اختصاص داده شده الزامی است'
    }),

  priority: Joi.string()
    .valid('low', 'normal', 'high', 'urgent')
    .default('normal'),

  dueDate: Joi.date()
    .optional(),

  tags: Joi.array()
    .items(Joi.string().trim())
    .optional(),

  notifications: Joi.object({
    dashboard: Joi.boolean().default(true),
    email: Joi.boolean().default(false),
    sms: Joi.boolean().default(false)
  }).optional()
});

export const updateTaskSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .optional(),

  description: Joi.string()
    .trim()
    .max(2000)
    .optional()
    .allow(''),

  status: Joi.string()
    .valid('pending', 'in_progress', 'completed', 'cancelled')
    .optional(),

  priority: Joi.string()
    .valid('low', 'normal', 'high', 'urgent')
    .optional(),

  dueDate: Joi.date()
    .optional()
    .allow(null),

  tags: Joi.array()
    .items(Joi.string().trim())
    .optional(),

  notifications: Joi.object({
    dashboard: Joi.boolean(),
    email: Joi.boolean(),
    sms: Joi.boolean()
  }).optional()
});

export const addCommentSchema = Joi.object({
  content: Joi.string()
    .trim()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'string.min': 'متن نظر باید حداقل ۱ کاراکتر باشد',
      'string.max': 'متن نظر باید حداکثر ۱۰۰۰ کاراکتر باشد',
      'any.required': 'متن نظر الزامی است'
    })
});

