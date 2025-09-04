import Joi from 'joi';

export const mediaUpdateSchema = Joi.object({
  title: Joi.object({
    fa: Joi.string().allow('').optional(),
    en: Joi.string().allow('').optional()
  }).optional(),

  altText: Joi.object({
    fa: Joi.string().allow('').optional(),
    en: Joi.string().allow('').optional()
  }).optional(),

  caption: Joi.object({
    fa: Joi.string().allow('').optional(),
    en: Joi.string().allow('').optional()
  }).optional(),

  description: Joi.object({
    fa: Joi.string().allow('').optional(),
    en: Joi.string().allow('').optional()
  }).optional(),

  tags: Joi.array().items(Joi.string()).optional(),

  folder: Joi.string().optional()
});

export const folderCreateSchema = Joi.object({
  folderPath: Joi.string()
    .required()
    .min(1)
    .max(255)
    .pattern(/^[a-zA-Z0-9_\-\/]+$/)
    .messages({
      'string.pattern.base': 'نام پوشه فقط می‌تواند شامل حروف، اعداد، خط تیره و اسلش باشد',
      'any.required': 'مسیر پوشه الزامی است'
    })
});
