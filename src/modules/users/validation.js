import Joi from 'joi';

export const createUserSchema = Joi.object({
  name: Joi.string().required().trim().min(2).max(100).messages({
    'any.required': 'نام الزامی است',
    'string.min': 'نام باید حداقل ۲ کاراکتر باشد'
  }),

  email: Joi.string().required().email().lowercase().trim().messages({
    'any.required': 'ایمیل الزامی است',
    'string.email': 'فرمت ایمیل صحیح نیست'
  }),

  phoneNumber: Joi.string()
    .pattern(/^(\+98|0)?9\d{9}$/)
    .optional()
    .allow(null, '')
    .messages({
      'string.pattern.base': 'شماره موبایل صحیح نیست'
    }),

  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      'string.min': 'رمز عبور باید حداقل ۸ کاراکتر باشد',
      'string.pattern.base': 'رمز عبور باید شامل حروف کوچک، بزرگ و عدد باشد'
    }),

  role: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'any.required': 'نقش کاربر الزامی است'
    }),

  language: Joi.string().valid('fa', 'en').default('fa'),

  status: Joi.string().valid('active', 'inactive', 'archived').default('active'),

  isEmailVerified: Joi.boolean().optional(),

  isPhoneNumberVerified: Joi.boolean().optional()
});

export const updateUserSchema = createUserSchema.fork(
  ['name', 'email', 'password', 'role'],
  schema => schema.optional()
);
