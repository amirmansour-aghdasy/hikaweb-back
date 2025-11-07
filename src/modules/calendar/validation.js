import Joi from 'joi';

export const createEventSchema = Joi.object({
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

  startDate: Joi.date()
    .required()
    .messages({
      'any.required': 'تاریخ شروع الزامی است'
    }),

  endDate: Joi.date()
    .optional(),

  isAllDay: Joi.boolean()
    .default(false),

  location: Joi.string()
    .trim()
    .max(200)
    .optional()
    .allow(''),

  attendees: Joi.array()
    .items(Joi.string())
    .optional(),

  type: Joi.string()
    .valid('meeting', 'event', 'reminder', 'deadline', 'holiday', 'other')
    .default('event'),

  color: Joi.string()
    .optional(),

  reminders: Joi.array()
    .items(Joi.object({
      type: Joi.string().valid('dashboard', 'email', 'sms').required(),
      minutesBefore: Joi.number().min(0).required()
    }))
    .optional(),

  tags: Joi.array()
    .items(Joi.string().trim())
    .optional()
});

export const updateEventSchema = Joi.object({
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

  startDate: Joi.date()
    .optional(),

  endDate: Joi.date()
    .optional()
    .allow(null),

  isAllDay: Joi.boolean()
    .optional(),

  location: Joi.string()
    .trim()
    .max(200)
    .optional()
    .allow(''),

  attendees: Joi.array()
    .items(Joi.string())
    .optional(),

  type: Joi.string()
    .valid('meeting', 'event', 'reminder', 'deadline', 'holiday', 'other')
    .optional(),

  color: Joi.string()
    .optional(),

  reminders: Joi.array()
    .items(Joi.object({
      type: Joi.string().valid('dashboard', 'email', 'sms').required(),
      minutesBefore: Joi.number().min(0).required()
    }))
    .optional(),

  tags: Joi.array()
    .items(Joi.string().trim())
    .optional()
});

export const respondToEventSchema = Joi.object({
  status: Joi.string()
    .valid('accepted', 'declined', 'tentative')
    .required()
    .messages({
      'any.required': 'وضعیت پاسخ الزامی است'
    })
});

