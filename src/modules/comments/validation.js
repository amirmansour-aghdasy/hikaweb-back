import Joi from 'joi';

export const createCommentSchema = Joi.object({
  content: Joi.string().min(10).max(1000).required(),

  rating: Joi.number().min(1).max(5).integer().required(),

  referenceType: Joi.string().valid('service', 'article', 'portfolio').required(),

  referenceId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  isAnonymous: Joi.boolean().default(false),

  authorName: Joi.string().when('isAnonymous', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional()
  }),

  authorEmail: Joi.string().email().when('isAnonymous', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

export const updateCommentSchema = Joi.object({
  content: Joi.string().min(10).max(1000),
  rating: Joi.number().min(1).max(5).integer(),
  status: Joi.string().valid('pending', 'approved', 'rejected')
});

export const moderateCommentSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),

  moderationNote: Joi.string().optional()
});
