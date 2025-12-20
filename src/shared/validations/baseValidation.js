/**
 * BaseValidation - Common validation schemas and helpers
 * 
 * این ماژول شامل validation schemas مشترک برای همه entities است:
 * - Slug validation (FA/EN)
 * - Multi-language fields (title, description, etc.)
 * - Category validation
 * - SEO fields
 * 
 * @example
 * import { slugSchema, multiLangStringSchema, categoryArraySchema } from './baseValidation.js';
 * 
 * export const createArticleSchema = Joi.object({
 *   title: multiLangStringSchema.required(),
 *   slug: slugSchema.optional(),
 *   categories: categoryArraySchema.required()
 * });
 */

import Joi from 'joi';

/**
 * Slug validation schema for both FA and EN
 */
export const slugSchema = Joi.object({
  fa: Joi.string()
    .optional()
    .trim()
    .pattern(/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-z0-9-]+$/)
    .messages({
      'string.pattern.base': 'آدرس یکتا فارسی فقط می‌تواند شامل حروف فارسی، حروف انگلیسی کوچک، اعداد و خط تیره باشد'
    }),
  en: Joi.string()
    .optional()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9-]+$/)
    .messages({
      'string.pattern.base': 'آدرس یکتا انگلیسی فقط می‌تواند شامل حروف کوچک، اعداد و خط تیره باشد'
    })
}).optional();

/**
 * Multi-language string schema (for title, description, etc.)
 * @param {Object} options - Options for validation
 * @param {number} options.minLength - Minimum length
 * @param {number} options.maxLength - Maximum length
 * @param {boolean} options.required - Whether field is required
 * @param {string} options.fieldName - Field name for error messages
 */
export const multiLangStringSchema = (options = {}) => {
  const {
    minLength = 0,
    maxLength = 10000,
    required = false,
    fieldName = 'field',
    allowEmpty = false
  } = options;

  const schema = Joi.object({
    fa: Joi.string()
      .trim()
      [required ? 'required' : 'optional']()
      [minLength > 0 ? 'min' : 'allow'](minLength > 0 ? minLength : '')
      [maxLength < 10000 ? 'max' : 'allow'](maxLength < 10000 ? maxLength : '')
      [allowEmpty ? 'allow' : 'disallow'](allowEmpty ? '' : '')
      .messages({
        'any.required': `${fieldName} فارسی الزامی است`,
        'string.min': `${fieldName} فارسی باید حداقل ${minLength} کاراکتر باشد`,
        'string.max': `${fieldName} فارسی نمی‌تواند بیش از ${maxLength} کاراکتر باشد`
      }),
    en: Joi.string()
      .trim()
      [required ? 'required' : 'optional']()
      [minLength > 0 ? 'min' : 'allow'](minLength > 0 ? minLength : '')
      [maxLength < 10000 ? 'max' : 'allow'](maxLength < 10000 ? maxLength : '')
      [allowEmpty ? 'allow' : 'disallow'](allowEmpty ? '' : '')
      .messages({
        'any.required': `${fieldName} انگلیسی الزامی است`,
        'string.min': `${fieldName} انگلیسی باید حداقل ${minLength} کاراکتر باشد`,
        'string.max': `${fieldName} انگلیسی نمی‌تواند بیش از ${maxLength} کاراکتر باشد`
      })
  });

  return required ? schema.required() : schema.optional();
};

/**
 * Category array validation schema
 * @param {Object} options - Options for validation
 * @param {number} options.minItems - Minimum number of categories
 * @param {boolean} options.required - Whether categories are required
 */
export const categoryArraySchema = (options = {}) => {
  const { minItems = 1, required = true } = options;

  const schema = Joi.array()
    .items(
      Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
          'string.pattern.base': 'شناسه دسته‌بندی نامعتبر است'
        })
    )
    [minItems > 0 ? 'min' : 'allow'](minItems > 0 ? minItems : 0)
    [required ? 'required' : 'optional']()
    .messages({
      'array.min': `حداقل ${minItems} دسته‌بندی باید انتخاب شود`,
      'any.required': 'دسته‌بندی الزامی است'
    });

  return schema;
};

/**
 * SEO fields validation schema
 */
export const seoSchema = Joi.object({
  metaTitle: Joi.object({
    fa: Joi.string().allow('').max(60).optional(),
    en: Joi.string().allow('').max(60).optional()
  }).optional(),
  metaDescription: Joi.object({
    fa: Joi.string().allow('').max(160).optional(),
    en: Joi.string().allow('').max(160).optional()
  }).optional(),
  metaKeywords: Joi.object({
    fa: Joi.array().items(Joi.string().trim()).optional(),
    en: Joi.array().items(Joi.string().trim()).optional()
  }).optional()
}).optional();

/**
 * Tags validation schema (multi-language array)
 */
export const tagsSchema = Joi.object({
  fa: Joi.array().items(Joi.string().trim()).optional(),
  en: Joi.array().items(Joi.string().trim()).optional()
}).optional();

/**
 * ObjectId validation schema
 * @param {string} fieldName - Field name for error messages
 */
export const objectIdSchema = (fieldName = 'شناسه') => {
  return Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': `${fieldName} نامعتبر است`
    });
};

/**
 * ObjectId array validation schema
 * @param {string} fieldName - Field name for error messages
 * @param {Object} options - Options for validation
 * @param {number} options.minItems - Minimum number of items
 * @param {boolean} options.required - Whether array is required
 */
export const objectIdArraySchema = (fieldName = 'شناسه', options = {}) => {
  const { minItems = 0, required = false } = options;
  
  let schema = Joi.array()
    .items(
      Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
          'string.pattern.base': `${fieldName} نامعتبر است`
        })
    );
  
  if (minItems > 0) {
    schema = schema.min(minItems);
  }
  
  return required ? schema.required() : schema.optional();
};

/**
 * Common status field validation
 */
export const statusSchema = Joi.string()
  .valid('active', 'inactive', 'archived')
  .default('active')
  .optional();

/**
 * Common boolean field validation
 * @param {boolean} defaultValue - Default value
 */
export const booleanSchema = (defaultValue = false) => {
  return Joi.boolean().default(defaultValue).optional();
};

