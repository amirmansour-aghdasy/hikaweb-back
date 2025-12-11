import mongoose from 'mongoose';
import {
  baseSchemaFields,
  baseSchemaMethods,
  baseSchemaStatics
} from '../../shared/models/baseModel.js';

const settingsSchema = new mongoose.Schema(
  {
    siteName: {
      fa: {
        type: String,
        required: true,
        default: 'هیکاوب'
      },
      en: {
        type: String,
        required: true,
        default: 'Hikaweb'
      }
    },

    siteDescription: {
      fa: String,
      en: String
    },

    logo: {
      main: String,
      favicon: String,
      dark: String,
      light: String
    },

    contact: {
      email: {
        type: String,
        required: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'ایمیل معتبر وارد کنید']
      },
      phone: String,
      phoneNumber: String,
      fax: String,

      address: {
        fa: String,
        en: String
      },

      coordinates: {
        latitude: Number,
        longitude: Number
      },

      workingHours: {
        fa: String,
        en: String
      }
    },

    socialMedia: {
      instagram: String,
      telegram: String,
      linkedin: String,
      twitter: String,
      youtube: String,
      aparat: String,
      whatsapp: String
    },

    seo: {
      defaultMetaTitle: {
        fa: String,
        en: String
      },
      defaultMetaDescription: {
        fa: String,
        en: String
      },
      defaultKeywords: {
        fa: [String],
        en: [String]
      },
      ogImage: String,
      googleAnalyticsId: String,
      googleTagManagerId: String,
      googleSiteVerification: String,
      bingVerification: String
    },

    email: {
      smtp: {
        host: String,
        port: Number,
        secure: Boolean,
        user: String,
        password: String
      },

      templates: {
        welcome: {
          subject: {
            fa: String,
            en: String
          },
          body: {
            fa: String,
            en: String
          }
        },

        passwordReset: {
          subject: {
            fa: String,
            en: String
          },
          body: {
            fa: String,
            en: String
          }
        }
      }
    },

    notifications: {
      telegram: {
        botToken: String,
        adminChatIds: [String],
        notificationTypes: [
          {
            type: String,
            enabled: Boolean
          }
        ]
      },

      sms: {
        enabled: Boolean,
        adminNumbers: [String]
      },

      email: {
        enabled: Boolean,
        adminEmails: [String]
      }
    },

    system: {
      maintenanceMode: {
        enabled: {
          type: Boolean,
          default: false
        },
        message: {
          fa: String,
          en: String
        },
        allowedIPs: [String]
      },

      registrationEnabled: {
        type: Boolean,
        default: true
      },

      defaultLanguage: {
        type: String,
        enum: ['fa', 'en'],
        default: 'fa'
      },

      timezone: {
        type: String,
        default: 'Asia/Tehran'
      },

      dateFormat: {
        type: String,
        default: 'YYYY-MM-DD'
      },

      maxFileSize: {
        type: Number,
        default: 10485760 // 10MB
      }
    },

    business: {
      companyName: {
        fa: String,
        en: String
      },

      registrationNumber: String,
      taxId: String,

      bankInfo: {
        accountNumber: String,
        iban: String,
        bankName: String,
        accountHolder: String
      },

      businessHours: [
        {
          day: {
            type: String,
            enum: ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday']
          },
          isOpen: Boolean,
          openTime: String,
          closeTime: String
        }
      ]
    },

    whatsapp: {
      enabled: {
        type: Boolean,
        default: true
      },
      agents: [
        {
          phoneNumber: {
            type: String,
            required: true
          },
          name: {
            type: String,
            required: true
          },
          message: {
            type: String,
            default: "سلام، می‌خواهم در مورد خدمات شما اطلاعات بیشتری دریافت کنم."
          },
          workingHours: {
            enabled: {
              type: Boolean,
              default: false
            },
            timezone: {
              type: String,
              default: "Asia/Tehran"
            },
            schedule: [
              {
                day: {
                  type: String,
                  enum: ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday']
                },
                isOpen: {
                  type: Boolean,
                  default: true
                },
                openTime: {
                  type: String,
                  default: "09:00"
                },
                closeTime: {
                  type: String,
                  default: "18:00"
                }
              }
            ]
          },
          offlineMessage: {
            type: String,
            default: "متأسفانه در حال حاضر خارج از ساعات کاری هستیم. لطفاً پیام خود را ارسال کنید تا در اولین فرصت با شما تماس بگیریم."
          }
        }
      ],
      config: {
        position: {
          type: String,
          enum: ['bottom-right', 'bottom-left'],
          default: 'bottom-right'
        },
        showPulse: {
          type: Boolean,
          default: true
        },
        size: {
          type: String,
          enum: ['small', 'medium', 'large'],
          default: 'medium'
        },
        collectUserInfo: {
          type: Boolean,
          default: false
        },
        showOnPages: [String],
        hideOnPages: [String],
        offlineMode: {
          type: String,
          enum: ['message', 'hide', 'button'],
          default: 'message'
        },
        language: {
          type: String,
          enum: ['fa', 'en'],
          default: 'fa'
        },
        autoCloseTimer: {
          type: Number,
          default: 0
        },
        notificationBadge: {
          type: Number,
          default: null
        }
      }
    },

    ...baseSchemaFields
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'settings'
  }
);

// Ensure only one settings document exists
settingsSchema.statics.getInstance = async function () {
  let settings = await this.findOne();

  if (!settings) {
    settings = new this({
      siteName: {
        fa: 'هیکاوب',
        en: 'Hikaweb'
      },
      contact: {
        email: 'info@hikaweb.ir'
      }
    });
    await settings.save();
  }

  return settings;
};

Object.assign(settingsSchema.methods, baseSchemaMethods);
Object.assign(settingsSchema.statics, baseSchemaStatics);

export const Settings = mongoose.model('Settings', settingsSchema);
