import Joi from 'joi';
import { objectIdSchema } from '../../shared/validations/baseValidation.js';

/**
 * Validation schemas for Orders
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
    }),
  email: Joi.string().email().trim().lowercase().required()
    .messages({
      'any.required': 'ایمیل الزامی است',
      'string.email': 'ایمیل معتبر وارد کنید'
    })
});

// Shipping Address Schema
const shippingAddressSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).optional(),
  phoneNumber: Joi.string().pattern(/^(\+98|0)?9\d{9}$/).optional(),
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
  postalCode: Joi.string().pattern(/^\d{10}$/).required()
    .messages({
      'any.required': 'کد پستی الزامی است',
      'string.pattern.base': 'کد پستی باید 10 رقم باشد'
    }),
  country: Joi.string().default('Iran').optional()
});

// Shipping Schema
const shippingSchema = Joi.object({
  address: shippingAddressSchema.optional(),
  method: Joi.string().valid('standard', 'express', 'pickup').default('standard').optional(),
  cost: Joi.number().min(0).default(0).optional(),
  trackingNumber: Joi.string().optional(),
  shippedAt: Joi.date().optional(),
  deliveredAt: Joi.date().optional()
});

// Create Order Schema
export const createOrderSchema = Joi.object({
  contactInfo: contactInfoSchema.required(),
  shipping: shippingSchema.optional(),
  paymentMethod: Joi.string().valid('online', 'points').required()
    .messages({
      'any.required': 'روش پرداخت الزامی است',
      'any.only': 'روش پرداخت نامعتبر است. فقط پرداخت آنلاین در دسترس است'
    }),
  notes: Joi.object({
    customer: Joi.string().max(1000).optional()
  }).optional()
});

// Update Order Status Schema
export const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded').required()
    .messages({
      'any.required': 'وضعیت سفارش الزامی است',
      'any.only': 'وضعیت سفارش نامعتبر است'
    }),
  note: Joi.string().max(500).optional()
});

// Cancel Order Schema
export const cancelOrderSchema = Joi.object({
  reason: Joi.string().max(500).optional()
});

// Get Orders Query Schema
export const getOrdersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(25).optional(),
  status: Joi.string().valid('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded').optional(),
  paymentStatus: Joi.string().valid('pending', 'completed', 'failed', 'refunded').optional(),
  orderNumber: Joi.string().optional(),
  userId: objectIdSchema('شناسه کاربر').optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional()
});

