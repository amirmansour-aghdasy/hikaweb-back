import Joi from 'joi';
import { objectIdSchema } from '../../shared/validations/baseValidation.js';

/**
 * Validation schemas for Shipping
 */

// Contact Info Schema
const contactInfoSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required()
    .messages({
      'any.required': 'نام و نام خانوادگی الزامی است',
      'string.min': 'نام باید حداقل 2 کاراکتر باشد',
      'string.max': 'نام نمی‌تواند بیش از 100 کاراکتر باشد'
    }),
  phoneNumber: Joi.string().pattern(/^(\+98|0)?9\d{9}$/).required()
    .messages({
      'any.required': 'شماره موبایل الزامی است',
      'string.pattern.base': 'شماره موبایل معتبر وارد کنید'
    })
});

// Address Schema
const addressSchema = Joi.object({
  address: Joi.string().trim().min(10).max(500).required()
    .messages({
      'any.required': 'آدرس الزامی است',
      'string.min': 'آدرس باید حداقل 10 کاراکتر باشد',
      'string.max': 'آدرس نمی‌تواند بیش از 500 کاراکتر باشد'
    }),
  city: Joi.string().trim().min(2).max(50).required()
    .messages({
      'any.required': 'شهر الزامی است',
      'string.min': 'نام شهر باید حداقل 2 کاراکتر باشد'
    }),
  province: Joi.string().trim().min(2).max(50).required()
    .messages({
      'any.required': 'استان الزامی است',
      'string.min': 'نام استان باید حداقل 2 کاراکتر باشد'
    }),
  postalCode: Joi.string().pattern(/^\d{10}$/).optional()
    .messages({
      'string.pattern.base': 'کد پستی باید 10 رقم باشد'
    }),
  country: Joi.string().default('Iran').optional(),
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional()
  }).optional()
});

// Create Address Schema
export const createAddressSchema = Joi.object({
  type: Joi.string().valid('home', 'work', 'other').default('home').optional(),
  label: Joi.string().trim().max(50).optional(),
  contactInfo: contactInfoSchema.required(),
  address: addressSchema.required(),
  isDefault: Joi.boolean().default(false).optional()
});

// Update Address Schema
export const updateAddressSchema = Joi.object({
  type: Joi.string().valid('home', 'work', 'other').optional(),
  label: Joi.string().trim().max(50).optional(),
  contactInfo: contactInfoSchema.optional(),
  address: addressSchema.optional(),
  isDefault: Joi.boolean().optional()
});

// Calculate Shipping Cost Schema
export const calculateShippingCostSchema = Joi.object({
  method: Joi.string().valid('standard', 'express', 'pickup').required()
    .messages({
      'any.required': 'روش ارسال الزامی است',
      'any.only': 'روش ارسال نامعتبر است'
    }),
  items: Joi.array().items(
    Joi.object({
      product: objectIdSchema('شناسه محصول').required(),
      quantity: Joi.number().integer().min(1).required()
    })
  ).default([]).optional(),
  orderTotal: Joi.number().min(0).default(0).optional(),
  destination: addressSchema.optional()
});

