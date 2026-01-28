import Joi from 'joi';

export const createConsultationSchema = Joi.object({
  fullName: Joi.string().required().trim().min(2).max(100).messages({
    'any.required': 'نام و نام خانوادگی الزامی است',
    'string.min': 'نام باید حداقل ۲ کاراکتر باشد'
  }),

  email: Joi.string().required().email().lowercase().trim().messages({
    'any.required': 'ایمیل الزامی است',
    'string.email': 'فرمت ایمیل صحیح نیست'
  }),

  phoneNumber: Joi.string()
    .required()
    .pattern(/^(\+98|0)?9\d{9}$/)
    .messages({
      'any.required': 'شماره موبایل الزامی است',
      'string.pattern.base': 'شماره موبایل صحیح نیست'
    }),

  company: Joi.object({
    name: Joi.string().trim(),
    website: Joi.string().uri(),
    industry: Joi.string().trim(),
    size: Joi.string().valid('startup', 'small', 'medium', 'large', 'enterprise')
  }).optional(),

  services: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .required()
    .messages({
      'array.min': 'حداقل یک خدمت باید انتخاب شود',
      'any.required': 'انتخاب خدمت الزامی است'
    }),

  projectDescription: Joi.string().required().trim().min(10).max(2000).messages({
    'any.required': 'شرح پروژه الزامی است',
    'string.min': 'شرح پروژه باید حداقل ۱۰ کاراکتر باشد'
  }),

  budget: Joi.string()
    .required()
    .valid('under-10m', '10m-50m', '50m-100m', '100m-500m', 'over-500m', 'custom')
    .messages({
      'any.required': 'انتخاب بودجه الزامی است'
    }),

  timeline: Joi.string()
    .required()
    .valid('asap', '1-month', '1-3months', '3-6months', '6months+', 'flexible')
    .messages({
      'any.required': 'انتخاب زمان‌بندی الزامی است'
    }),

  preferredContactMethod: Joi.string()
    .valid('email', 'phone', 'telegram', 'video_call')
    .default('email'),

  preferredContactTime: Joi.string()
    .valid('morning', 'afternoon', 'evening', 'anytime')
    .default('anytime'),

  leadSource: Joi.string()
    .valid('website', 'referral', 'social_media', 'google_ads', 'direct', 'other')
    .default('website'),

  utmParams: Joi.object({
    source: Joi.string(),
    medium: Joi.string(),
    campaign: Joi.string(),
    term: Joi.string(),
    content: Joi.string()
  }).optional()
});

// Simple consultation form schema for homepage
export const createSimpleConsultationSchema = Joi.object({
  // Support both fullName (new simplified form) and firstName/lastName (old form for compatibility)
  fullName: Joi.string().trim().min(2).max(100).optional().messages({
    'string.min': 'نام باید حداقل ۲ کاراکتر باشد'
  }),
  firstName: Joi.string().trim().min(2).max(50).optional().messages({
    'string.min': 'نام باید حداقل ۲ کاراکتر باشد'
  }),
  lastName: Joi.string().trim().min(2).max(50).optional().messages({
    'string.min': 'نام خانوادگی باید حداقل ۲ کاراکتر باشد'
  }),
  phone: Joi.string()
    .required()
    .pattern(/^(\+98|0)?9\d{9}$/)
    .messages({
      'any.required': 'شماره موبایل الزامی است',
      'string.pattern.base': 'شماره موبایل صحیح نیست'
    }),
  email: Joi.string().email().lowercase().trim().optional().allow('').messages({
    'string.email': 'فرمت ایمیل صحیح نیست'
  }),
  serviceId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'شناسه خدمت نامعتبر است'
    }),
  productId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'شناسه محصول نامعتبر است'
    }),
  type: Joi.string()
    .valid('service', 'product')
    .optional()
    .default('service')
}).or('fullName', 'firstName').custom((value, helpers) => {
  // At least one of serviceId or productId must be provided
  if (!value.serviceId && !value.productId) {
    return helpers.error('any.custom', { message: 'باید یا serviceId یا productId را ارسال کنید' });
  }
  // Both cannot be provided at the same time
  if (value.serviceId && value.productId) {
    return helpers.error('any.custom', { message: 'نمی‌توانید همزمان serviceId و productId را ارسال کنید' });
  }
  return value;
}).messages({
  'object.missing': 'نام و نام خانوادگی الزامی است',
  'any.custom': 'باید یا serviceId یا productId را ارسال کنید'
});

export const updateConsultationSchema = Joi.object({
  requestStatus: Joi.string()
    .valid(
      'new',
      'contacted',
      'in_discussion',
      'proposal_sent',
      'accepted',
      'rejected',
      'converted'
    )
    .optional(),

  assignedTo: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow(null)
    .optional(),

  convertedToProject: Joi.boolean().optional(),

  projectValue: Joi.number().min(0).optional(),

  internalNotes: Joi.array()
    .items(
      Joi.object({
        note: Joi.string().required(),
        author: Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
      })
    )
    .optional()
});
