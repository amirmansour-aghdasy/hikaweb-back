import Joi from 'joi';
import { objectIdSchema } from '../../shared/validations/baseValidation.js';

/**
 * Validation schemas for Payments
 */

// Initialize Payment Schema
export const initializePaymentSchema = Joi.object({
  orderId: objectIdSchema('شناسه سفارش').required()
    .messages({
      'any.required': 'شناسه سفارش الزامی است'
    }),
  gateway: Joi.string().valid('zarinpal', 'idpay', 'saman').optional()
    .messages({
      'any.only': 'درگاه پرداخت نامعتبر است'
    })
});

// Refund Payment Schema
export const refundPaymentSchema = Joi.object({
  reason: Joi.string().trim().max(500).optional(),
  amount: Joi.number().min(0).optional()
    .messages({
      'number.min': 'مبلغ بازگشت نمی‌تواند منفی باشد'
    })
});

// Get Payments Query Schema
export const getPaymentsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional(),
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded').optional()
});

