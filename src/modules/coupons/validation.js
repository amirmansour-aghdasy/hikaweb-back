import Joi from 'joi';
import { objectIdSchema, objectIdArraySchema } from '../../shared/validations/baseValidation.js';

/**
 * Validation schemas for Coupons
 */

// Create Coupon Schema
export const createCouponSchema = Joi.object({
  code: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .required()
    .messages({
      'any.required': 'کد تخفیف الزامی است',
      'string.min': 'کد تخفیف باید حداقل 3 کاراکتر باشد',
      'string.max': 'کد تخفیف نمی‌تواند بیش از 50 کاراکتر باشد'
    }),
  
  type: Joi.string()
    .valid('percentage', 'fixed')
    .required()
    .messages({
      'any.required': 'نوع تخفیف الزامی است',
      'any.only': 'نوع تخفیف باید percentage یا fixed باشد'
    }),
  
  value: Joi.number()
    .min(0)
    .required()
    .when('type', {
      is: 'percentage',
      then: Joi.number().max(100).messages({
        'number.max': 'درصد تخفیف نمی‌تواند بیش از 100 باشد'
      }),
      otherwise: Joi.number()
    })
    .messages({
      'any.required': 'مقدار تخفیف الزامی است',
      'number.min': 'مقدار تخفیف نمی‌تواند منفی باشد'
    }),
  
  limits: Joi.object({
    minOrderAmount: Joi.number().min(0).default(0).optional(),
    maxDiscountAmount: Joi.number().min(0).allow(null).optional(),
    maxUsage: Joi.number().integer().min(0).allow(null).optional(),
    maxUsagePerUser: Joi.number().integer().min(0).allow(null).optional()
  }).optional(),
  
  validFrom: Joi.date().default(Date.now).optional(),
  validUntil: Joi.date().required()
    .messages({
      'any.required': 'تاریخ انقضا الزامی است'
    }),
  
  applicableTo: Joi.object({
    products: objectIdArraySchema('محصول', { minItems: 0, required: false }),
    categories: objectIdArraySchema('دسته‌بندی', { minItems: 0, required: false }),
    allProducts: Joi.boolean().default(true).optional()
  }).optional(),
  
  excludedFrom: Joi.object({
    products: objectIdArraySchema('محصول', { minItems: 0, required: false }),
    categories: objectIdArraySchema('دسته‌بندی', { minItems: 0, required: false })
  }).optional(),
  
  restrictions: Joi.object({
    users: objectIdArraySchema('کاربر', { minItems: 0, required: false }),
    newUsersOnly: Joi.boolean().default(false).optional(),
    minUserLevel: Joi.number().min(0).default(0).optional()
  }).optional(),
  
  description: Joi.object({
    fa: Joi.string().trim().max(500).optional(),
    en: Joi.string().trim().max(500).optional()
  }).optional(),
  
  isActive: Joi.boolean().default(true).optional()
});

// Update Coupon Schema
export const updateCouponSchema = Joi.object({
  code: Joi.string().trim().min(3).max(50).optional(),
  type: Joi.string().valid('percentage', 'fixed').optional(),
  value: Joi.number().min(0).optional(),
  limits: Joi.object({
    minOrderAmount: Joi.number().min(0).optional(),
    maxDiscountAmount: Joi.number().min(0).allow(null).optional(),
    maxUsage: Joi.number().integer().min(0).allow(null).optional(),
    maxUsagePerUser: Joi.number().integer().min(0).allow(null).optional()
  }).optional(),
  validFrom: Joi.date().optional(),
  validUntil: Joi.date().optional(),
  applicableTo: Joi.object({
    products: objectIdArraySchema('محصول', { minItems: 0, required: false }),
    categories: objectIdArraySchema('دسته‌بندی', { minItems: 0, required: false }),
    allProducts: Joi.boolean().optional()
  }).optional(),
  excludedFrom: Joi.object({
    products: objectIdArraySchema('محصول', { minItems: 0, required: false }),
    categories: objectIdArraySchema('دسته‌بندی', { minItems: 0, required: false })
  }).optional(),
  restrictions: Joi.object({
    users: objectIdArraySchema('کاربر', { minItems: 0, required: false }),
    newUsersOnly: Joi.boolean().optional(),
    minUserLevel: Joi.number().min(0).optional()
  }).optional(),
  description: Joi.object({
    fa: Joi.string().trim().max(500).optional(),
    en: Joi.string().trim().max(500).optional()
  }).optional(),
  isActive: Joi.boolean().optional()
});

// Validate Coupon Schema
export const validateCouponSchema = Joi.object({
  code: Joi.string().trim().required()
    .messages({
      'any.required': 'کد تخفیف الزامی است'
    }),
  orderAmount: Joi.number().min(0).default(0).optional(),
  items: Joi.array().items(
    Joi.object({
      product: objectIdSchema('شناسه محصول').required(),
      quantity: Joi.number().integer().min(1).required()
    })
  ).default([]).optional()
});

// Get Coupons Query Schema
export const getCouponsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(25).optional(),
  isActive: Joi.boolean().optional(),
  code: Joi.string().optional(),
  type: Joi.string().valid('percentage', 'fixed').optional(),
  valid: Joi.boolean().optional()
});

