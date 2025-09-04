import mongoose from 'mongoose';
import {
  baseSchemaFields,
  baseSchemaMethods,
  baseSchemaStatics
} from '../../shared/models/BaseModel.js';

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'نام برند الزامی است'],
      trim: true,
      maxLength: [100, 'نام برند نمی‌تواند بیش از ۱۰۰ کاراکتر باشد']
    },

    logo: {
      type: String,
      required: [true, 'لوگو برند الزامی است']
    },

    website: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return !v || /^https?:\/\/.+\..+/.test(v);
        },
        message: 'آدرس وب‌سایت معتبر وارد کنید'
      }
    },

    description: {
      fa: {
        type: String,
        trim: true
      },
      en: {
        type: String,
        trim: true
      }
    },

    industry: {
      fa: {
        type: String,
        trim: true
      },
      en: {
        type: String,
        trim: true
      }
    },

    serviceField: {
      type: String,
      enum: [
        'web_development',
        'mobile_app',
        'digital_marketing',
        'seo',
        'design',
        'consulting',
        'other'
      ],
      required: true
    },

    projectCount: {
      type: Number,
      default: 0,
      min: 0
    },

    collaborationPeriod: {
      startDate: Date,
      endDate: Date,
      isOngoing: {
        type: Boolean,
        default: false
      }
    },

    orderIndex: {
      type: Number,
      default: 0
    },

    isPartner: {
      type: Boolean,
      default: false
    },

    isFeatured: {
      type: Boolean,
      default: false
    },

    ...baseSchemaFields
  },
  {
    timestamps: true,
    versionKey: false
  }
);

brandSchema.index({ name: 1 });
brandSchema.index({ serviceField: 1 });
brandSchema.index({ isPartner: -1 });
brandSchema.index({ isFeatured: -1 });
brandSchema.index({ orderIndex: 1 });
brandSchema.index({ name: 'text' });

Object.assign(brandSchema.methods, baseSchemaMethods);
Object.assign(brandSchema.statics, baseSchemaStatics);

export const Brand = mongoose.model('Brand', brandSchema);
