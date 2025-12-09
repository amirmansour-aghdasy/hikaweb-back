import mongoose from 'mongoose';
import {
  baseSchemaFields,
  baseSchemaMethods,
  baseSchemaStatics
} from '../../shared/models/baseModel.js';

const bannerSchema = new mongoose.Schema(
  {
    title: {
      fa: {
        type: String,
        trim: true,
        maxLength: [200, 'عنوان نمی‌تواند بیش از ۲۰۰ کاراکتر باشد']
      },
      en: {
        type: String,
        trim: true,
        maxLength: [200, 'عنوان نمی‌تواند بیش از ۲۰۰ کاراکتر باشد']
      }
    },

    description: {
      fa: String,
      en: String
    },

    // تصویر برای دسکتاپ
    image: {
      type: String,
      required: [true, 'تصویر دسکتاپ الزامی است']
    },

    // تصویر برای موبایل
    mobileImage: {
      type: String
    },

    // لینک بنر
    link: {
      url: {
        type: String,
        required: [true, 'لینک بنر الزامی است']
      },
      target: {
        type: String,
        enum: ['_self', '_blank'],
        default: '_self'
      },
      text: {
        fa: String,
        en: String
      }
    },

    // موقعیت نمایش بنر (home-page-banners, etc.)
    position: {
      type: String,
      required: true,
      default: 'home-page-banners',
      enum: ['home-page-banners'],
      index: true
    },

    // ترتیب نمایش
    orderIndex: {
      type: Number,
      required: true,
      default: 0
    },

    // فعال/غیرفعال
    isActive: {
      type: Boolean,
      default: true
    },

    // تاریخ شروع و پایان نمایش (اختیاری)
    schedule: {
      startDate: Date,
      endDate: Date,
      isScheduled: {
        type: Boolean,
        default: false
      }
    },

    // آمار و آنالیتیکس
    analytics: {
      views: {
        type: Number,
        default: 0
      },
      clicks: {
        type: Number,
        default: 0
      },
      ctr: {
        type: Number,
        default: 0
      }
    },

    // تنظیمات اضافی
    settings: {
      altText: {
        fa: String,
        en: String
      },
      showOnMobile: {
        type: Boolean,
        default: true
      },
      showOnDesktop: {
        type: Boolean,
        default: true
      }
    },

    ...baseSchemaFields
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes
bannerSchema.index({ position: 1, orderIndex: 1 });
bannerSchema.index({ isActive: 1, position: 1 });
bannerSchema.index({ 'schedule.startDate': 1, 'schedule.endDate': 1 });
bannerSchema.index({ status: 1, isActive: 1 });

// Apply base methods and statics
Object.assign(bannerSchema.methods, baseSchemaMethods);
Object.assign(bannerSchema.statics, baseSchemaStatics);

// Track click
bannerSchema.methods.trackClick = function () {
  this.analytics.clicks += 1;
  this.analytics.ctr =
    this.analytics.views > 0 ? (this.analytics.clicks / this.analytics.views) * 100 : 0;
  return this.save();
};

// Track view
bannerSchema.methods.trackView = function () {
  this.analytics.views += 1;
  this.analytics.ctr =
    this.analytics.clicks > 0 ? (this.analytics.clicks / this.analytics.views) * 100 : 0;
  return this.save();
};

export const Banner = mongoose.model('Banner', bannerSchema);

