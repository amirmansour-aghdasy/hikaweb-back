import Joi from 'joi';
import {
  multiLangStringSchema,
  objectIdSchema
} from '../../shared/validations/baseValidation.js';

export const createBrandSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),

  slug: Joi.string()
    .pattern(/^[a-z0-9-]+$/)
    .optional(),

  logo: Joi.string().optional(),

  description: multiLangStringSchema({
    allowEmpty: true,
    fieldName: 'توضیحات'
  }),

  website: Joi.string().uri().optional(),

  industry: Joi.string().optional(),

  serviceField: Joi.string().optional(),

  collaborationPeriod: Joi.object({
    startDate: Joi.date(),
    endDate: Joi.date(),
    isOngoing: Joi.boolean().default(false)
  }).optional(),

  projectsCount: Joi.number().min(0).default(1),

  tags: Joi.array().items(Joi.string()).optional(),

  contactInfo: Joi.object({
    email: Joi.string().email(),
    phone: Joi.string(),
    address: Joi.string()
  }).optional(),

  socialLinks: Joi.object({
    linkedin: Joi.string().uri(),
    twitter: Joi.string().uri(),
    instagram: Joi.string().uri(),
    facebook: Joi.string().uri()
  }).optional(),

  orderIndex: Joi.number().default(0),

  isFeatured: Joi.boolean().default(false),

  isPublic: Joi.boolean().default(true),

  status: Joi.string().valid('active', 'inactive', 'archived').default('active')
});

export const updateBrandSchema = createBrandSchema.fork(['name', 'slug'], schema =>
  schema.optional()
);
