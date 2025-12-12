import Joi from 'joi';

export const createTeamMemberSchema = Joi.object({
  name: Joi.object({
    fa: Joi.string().required(),
    en: Joi.string().required()
  }).required(),

  slug: Joi.string()
    .pattern(/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-z0-9-]+$/) // Allow Persian characters, English letters, numbers, and dashes
    .required(),

  position: Joi.object({
    fa: Joi.string().required(),
    en: Joi.string().required()
  }).required(),

  bio: Joi.object({
    fa: Joi.string(),
    en: Joi.string()
  }).optional(),

  avatar: Joi.string().required(),

  department: Joi.string()
    .valid('management', 'development', 'design', 'marketing', 'sales', 'support')
    .required(),

  email: Joi.string().email().optional(),
  phone: Joi.string().optional(),

  socialLinks: Joi.object({
    linkedin: Joi.string().uri().optional(),
    twitter: Joi.string().uri().optional(),
    github: Joi.string().uri().optional(),
    telegram: Joi.string().optional(),
    instagram: Joi.string().optional()
  }).optional(),

  skills: Joi.array().items(Joi.string()).optional(),

  experience: Joi.number().min(0).optional(),

  joinDate: Joi.date().optional(),

  orderIndex: Joi.number().default(0),

  isPublic: Joi.boolean().default(true),

  status: Joi.string().valid('active', 'inactive', 'archived').default('active')
});

export const updateTeamMemberSchema = createTeamMemberSchema.fork(
  ['name', 'slug', 'position'],
  schema => schema.optional()
);
