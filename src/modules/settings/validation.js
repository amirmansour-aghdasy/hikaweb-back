import Joi from 'joi';

export const updateSettingsSchema = Joi.object({
  siteName: Joi.object({
    fa: Joi.string().trim(),
    en: Joi.string().trim()
  }).optional(),

  siteDescription: Joi.object({
    fa: Joi.string().trim(),
    en: Joi.string().trim()
  }).optional(),

  logo: Joi.object({
    main: Joi.string(),
    favicon: Joi.string(),
    dark: Joi.string(),
    light: Joi.string()
  }).optional(),

  contact: Joi.object({
    email: Joi.string().email(),
    phone: Joi.string(),
    phoneNumber: Joi.string(),
    fax: Joi.string(),
    address: Joi.object({
      fa: Joi.string(),
      en: Joi.string()
    }),
    coordinates: Joi.object({
      latitude: Joi.number(),
      longitude: Joi.number()
    }),
    workingHours: Joi.object({
      fa: Joi.string(),
      en: Joi.string()
    })
  }).optional(),

  socialMedia: Joi.object({
    instagram: Joi.string().allow(''),
    telegram: Joi.string().allow(''),
    linkedin: Joi.string().allow(''),
    twitter: Joi.string().allow(''),
    youtube: Joi.string().allow(''),
    aparat: Joi.string().allow(''),
    whatsapp: Joi.string().allow('')
  }).optional(),

  seo: Joi.object({
    defaultMetaTitle: Joi.object({
      fa: Joi.string(),
      en: Joi.string()
    }),
    defaultMetaDescription: Joi.object({
      fa: Joi.string(),
      en: Joi.string()
    }),
    defaultKeywords: Joi.object({
      fa: Joi.array().items(Joi.string()),
      en: Joi.array().items(Joi.string())
    }),
    googleAnalyticsId: Joi.string().allow(''),
    googleTagManagerId: Joi.string().allow(''),
    googleSiteVerification: Joi.string().allow(''),
    bingVerification: Joi.string().allow('')
  }).optional(),

  system: Joi.object({
    maintenanceMode: Joi.object({
      enabled: Joi.boolean(),
      message: Joi.object({
        fa: Joi.string(),
        en: Joi.string()
      }),
      allowedIPs: Joi.array().items(Joi.string())
    }),
    registrationEnabled: Joi.boolean(),
    defaultLanguage: Joi.string().valid('fa', 'en'),
    maxFileSize: Joi.number().min(1)
  }).optional()
});
