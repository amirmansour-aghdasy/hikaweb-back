import Joi from 'joi';

export const createTicketSchema = Joi.object({
  subject: Joi.string().required().trim().min(5).max(200).messages({
    'any.required': 'موضوع تیکت الزامی است',
    'string.min': 'موضوع تیکت باید حداقل ۵ کاراکتر باشد'
  }),

  description: Joi.string().required().trim().min(10).messages({
    'any.required': 'شرح تیکت الزامی است',
    'string.min': 'شرح تیکت باید حداقل ۱۰ کاراکتر باشد'
  }),

  department: Joi.string()
    .required()
    .valid('technical', 'sales', 'support', 'billing', 'general')
    .messages({
      'any.required': 'بخش تیکت الزامی است'
    }),

  priority: Joi.string().valid('low', 'normal', 'high', 'urgent', 'critical').default('normal'),

  category: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional(),

  tags: Joi.array().items(Joi.string().trim()).optional()
});

export const updateTicketSchema = Joi.object({
  subject: Joi.string().trim().min(5).max(200).optional(),
  description: Joi.string().trim().min(10).optional(),
  department: Joi.string().valid('technical', 'sales', 'support', 'billing', 'general').optional(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent', 'critical').optional(),
  ticketStatus: Joi.string()
    .valid('open', 'in_progress', 'waiting_response', 'resolved', 'closed', 'cancelled')
    .optional(),
  assignedTo: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow(null)
    .optional(),
  tags: Joi.array().items(Joi.string().trim()).optional()
});

export const addMessageSchema = Joi.object({
  content: Joi.string().required().trim().min(1).messages({
    'any.required': 'محتوای پیام الزامی است'
  }),

  isInternal: Joi.boolean().default(false)
});

export const assignTicketSchema = Joi.object({
  assignedTo: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'any.required': 'شناسه کاربر برای واگذاری الزامی است'
    })
});

export const closeTicketSchema = Joi.object({
  summary: Joi.string().required().trim().min(10).messages({
    'any.required': 'خلاصه حل مشکل الزامی است'
  })
});
