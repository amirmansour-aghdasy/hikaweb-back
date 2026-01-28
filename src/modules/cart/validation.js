import Joi from 'joi';

/**
 * Validation schemas for Cart operations
 */

export const addItemSchema = Joi.object({
  productId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'شناسه محصول معتبر نیست',
      'any.required': 'شناسه محصول الزامی است'
    }),
  quantity: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(1)
    .messages({
      'number.min': 'تعداد باید حداقل 1 باشد',
      'number.max': 'تعداد نمی‌تواند بیش از 100 باشد'
    })
});

export const updateItemQuantitySchema = Joi.object({
  quantity: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .required()
    .messages({
      'number.min': 'تعداد نمی‌تواند منفی باشد',
      'number.max': 'تعداد نمی‌تواند بیش از 100 باشد',
      'any.required': 'تعداد الزامی است'
    })
});

export const applyCouponSchema = Joi.object({
  couponCode: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.min': 'کد تخفیف باید حداقل 3 کاراکتر باشد',
      'string.max': 'کد تخفیف نمی‌تواند بیش از 50 کاراکتر باشد',
      'any.required': 'کد تخفیف الزامی است'
    })
});

export const shippingAddressSchema = Joi.object({
  fullName: Joi.string().trim().min(3).max(100).required(),
  phoneNumber: Joi.string()
    .pattern(/^(\+98|0)?9\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': 'شماره موبایل معتبر نیست'
    }),
  address: Joi.string().trim().min(10).max(500).required(),
  city: Joi.string().trim().min(2).max(100).required(),
  province: Joi.string().trim().min(2).max(100).required(),
  postalCode: Joi.string()
    .pattern(/^\d{10}$/)
    .optional()
    .messages({
      'string.pattern.base': 'کد پستی باید 10 رقم باشد'
    }),
  country: Joi.string().default('Iran')
});

export const updateShippingSchema = Joi.object({
  address: shippingAddressSchema.required(),
  method: Joi.string()
    .valid('standard', 'express', 'pickup')
    .default('standard')
});

