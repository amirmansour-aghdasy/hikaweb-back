import Joi from 'joi';

export const createEmailAccountSchema = Joi.object({
  address: Joi.string().email().trim().lowercase().required().messages({
    'string.email': 'آدرس ایمیل معتبر نیست',
    'any.required': 'آدرس ایمیل الزامی است'
  }),
  displayName: Joi.string().trim().max(200).allow(''),
  smtpHost: Joi.string().trim().required().messages({
    'any.required': 'سرور SMTP الزامی است'
  }),
  smtpPort: Joi.number().integer().min(1).max(65535).default(587),
  smtpSecure: Joi.boolean().default(false),
  smtpUser: Joi.string().trim().required().messages({
    'any.required': 'نام کاربری SMTP الزامی است'
  }),
  smtpPassword: Joi.string().required().messages({
    'any.required': 'رمز عبور SMTP الزامی است'
  }),
  isDefault: Joi.boolean().default(false),
  imapHost: Joi.string().trim().allow(''),
  imapPort: Joi.number().integer().min(1).max(65535).default(993),
  imapSecure: Joi.boolean().default(true)
});

export const updateEmailAccountSchema = Joi.object({
  address: Joi.string().email().trim().lowercase(),
  displayName: Joi.string().trim().max(200).allow(''),
  smtpHost: Joi.string().trim(),
  smtpPort: Joi.number().integer().min(1).max(65535),
  smtpSecure: Joi.boolean(),
  smtpUser: Joi.string().trim(),
  smtpPassword: Joi.string().allow(''),
  isDefault: Joi.boolean(),
  imapHost: Joi.string().trim().allow(''),
  imapPort: Joi.number().integer().min(1).max(65535),
  imapSecure: Joi.boolean()
}).min(1);

export const sendEmailSchema = Joi.object({
  to: Joi.alternatives().try(
    Joi.string().email(),
    Joi.array().items(Joi.string().email())
  ).required().messages({
    'any.required': 'گیرنده ایمیل الزامی است'
  }),
  cc: Joi.alternatives().try(
    Joi.string().email(),
    Joi.array().items(Joi.string().email())
  ),
  bcc: Joi.alternatives().try(
    Joi.string().email(),
    Joi.array().items(Joi.string().email())
  ),
  subject: Joi.string().trim().required().messages({
    'any.required': 'موضوع ایمیل الزامی است'
  }),
  html: Joi.string().allow(''),
  text: Joi.string().allow(''),
  accountId: Joi.string().hex().length(24)
});
