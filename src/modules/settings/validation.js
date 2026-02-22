import Joi from 'joi';

export const updateSettingsSchema = Joi.object({
  siteName: Joi.object({
    fa: Joi.string().trim(),
    en: Joi.string().trim()
  }).optional(),

  siteDescription: Joi.object({
    fa: Joi.string().trim().allow(''),
    en: Joi.string().trim().allow('')
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

  email: Joi.object({
    smtp: Joi.object({
      host: Joi.string().allow(''),
      port: Joi.number(),
      secure: Joi.boolean(),
      user: Joi.string().allow(''),
      password: Joi.string().allow('')
    }),
    from: Joi.object({
      name: Joi.string().allow(''),
      email: Joi.string().email().allow('')
    }),
    templates: Joi.object({
      welcome: Joi.object({
        subject: Joi.object({ fa: Joi.string(), en: Joi.string() }),
        body: Joi.object({ fa: Joi.string(), en: Joi.string() })
      }),
      passwordReset: Joi.object({
        subject: Joi.object({ fa: Joi.string(), en: Joi.string() }),
        body: Joi.object({ fa: Joi.string(), en: Joi.string() })
      })
    }),
    notifications: Joi.object({
      newUser: Joi.boolean(),
      newComment: Joi.boolean(),
      newTicket: Joi.boolean()
    })
  }).optional(),

  security: Joi.object({
    rateLimit: Joi.object({
      enabled: Joi.boolean(),
      maxRequests: Joi.number()
    }),
    password: Joi.object({
      minLength: Joi.number(),
      requireUppercase: Joi.boolean(),
      requireNumbers: Joi.boolean()
    }),
    security: Joi.object({
      maxLoginAttempts: Joi.number(),
      enableCsrfProtection: Joi.boolean()
    })
  }).optional(),

  media: Joi.object({
    storage: Joi.object({
      provider: Joi.string(),
      maxFileSize: Joi.number(),
      allowedTypes: Joi.array().items(Joi.string())
    })
  }).optional(),

  notifications: Joi.object({
    telegram: Joi.object({
      enabled: Joi.boolean(),
      botToken: Joi.string().allow(''),
      chatId: Joi.string().allow('')
    }),
    sms: Joi.object({
      enabled: Joi.boolean(),
      apiKey: Joi.string().allow(''),
      sender: Joi.string().allow('')
    })
  }).optional(),

  theme: Joi.object({
    colors: Joi.object({
      primary: Joi.string(),
      secondary: Joi.string(),
      background: Joi.string()
    }),
    typography: Joi.object({
      fontFamily: Joi.string(),
      fontSize: Joi.number()
    }),
    features: Joi.object({
      darkMode: Joi.boolean(),
      rtlSupport: Joi.boolean(),
      animations: Joi.boolean()
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
  }).optional(),

  whatsapp: Joi.object({
    enabled: Joi.boolean().optional(),
    agents: Joi.array().items(
      Joi.object({
        phoneNumber: Joi.string().required(),
        name: Joi.string().required(),
        message: Joi.string().allow('').optional(),
        workingHours: Joi.object({
          enabled: Joi.boolean().optional(),
          timezone: Joi.string().optional(),
          schedule: Joi.array().items(
            Joi.object({
              day: Joi.string().valid('saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday').required(),
              isOpen: Joi.boolean().optional(),
              openTime: Joi.string().allow('').optional(),
              closeTime: Joi.string().allow('').optional()
            })
          ).optional()
        }).optional(),
        offlineMessage: Joi.string().allow('').optional()
      })
    ).optional(),
    config: Joi.object({
      position: Joi.string().valid('bottom-right', 'bottom-left').optional(),
      showPulse: Joi.boolean().optional(),
      size: Joi.string().valid('small', 'medium', 'large').optional(),
      collectUserInfo: Joi.boolean().optional(),
      showOnPages: Joi.array().items(Joi.string()).optional(),
      hideOnPages: Joi.array().items(Joi.string()).optional(),
      offlineMode: Joi.string().valid('message', 'hide', 'button').optional(),
      language: Joi.string().valid('fa', 'en').optional(),
      autoCloseTimer: Joi.number().min(0).optional(),
      notificationBadge: Joi.number().min(0).allow(null).optional()
    }).optional()
  }).optional(),

  announcementBar: Joi.object({
    enabled: Joi.boolean().optional(),
    text: Joi.string().trim().allow('').optional(),
    link: Joi.string().trim().allow('').optional(),
    durationDays: Joi.number().min(1).max(365).optional(),
    autoRenew: Joi.boolean().optional()
  }).optional()
});
