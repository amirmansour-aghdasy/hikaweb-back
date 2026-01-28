import Joi from 'joi';

/**
 * Validation schemas for Product Questions
 */

export const askQuestionSchema = Joi.object({
  question: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.min': 'سوال باید حداقل 10 کاراکتر باشد',
      'string.max': 'سوال نمی‌تواند بیش از 500 کاراکتر باشد',
      'any.required': 'سوال الزامی است'
    })
});

export const answerQuestionSchema = Joi.object({
  answer: Joi.string()
    .trim()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.min': 'پاسخ باید حداقل 10 کاراکتر باشد',
      'string.max': 'پاسخ نمی‌تواند بیش از 1000 کاراکتر باشد',
      'any.required': 'پاسخ الزامی است'
    })
});

export const moderateQuestionSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'approved', 'rejected', 'spam')
    .required()
    .messages({
      'any.only': 'وضعیت تایید نامعتبر است',
      'any.required': 'وضعیت تایید الزامی است'
    }),
  reason: Joi.string()
    .trim()
    .max(500)
    .optional()
    .messages({
      'string.max': 'دلیل نمی‌تواند بیش از 500 کاراکتر باشد'
    })
});

export const moderateAnswerSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'approved', 'rejected')
    .required()
    .messages({
      'any.only': 'وضعیت تایید نامعتبر است',
      'any.required': 'وضعیت تایید الزامی است'
    })
});

