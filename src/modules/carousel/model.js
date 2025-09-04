import mongoose from 'mongoose';
import {
  baseSchemaFields,
  baseSchemaMethods,
  baseSchemaStatics
} from '../../shared/models/BaseModel.js';

const carouselSchema = new mongoose.Schema(
  {
    title: {
      fa: {
        type: String,
        required: [true, 'عنوان فارسی الزامی است'],
        trim: true,
        maxLength: [200, 'عنوان نمی‌تواند بیش از ۲۰۰ کاراکتر باشد']
      },
      en: {
        type: String,
        required: [true, 'عنوان انگلیسی الزامی است'],
        trim: true,
        maxLength: [200, 'عنوان نمی‌تواند بیش از ۲۰۰ کاراکتر باشد']
      }
    },

    subtitle: {
      fa: String,
      en: String
    },

    description: {
      fa: String,
      en: String
    },

    image: {
      type: String,
      required: [true, 'تصویر اسلاید الزامی است']
    },

    mobileImage: {
      type: String
    },

    link: {
      url: String,
      text: {
        fa: String,
        en: String
      },
      target: {
        type: String,
        enum: ['_self', '_blank'],
        default: '_self'
      }
    },

    button: {
      text: {
        fa: String,
        en: String
      },
      url: String,
      style: {
        type: String,
        enum: ['primary', 'secondary', 'outline', 'ghost'],
        default: 'primary'
      },
      target: {
        type: String,
        enum: ['_self', '_blank'],
        default: '_self'
      }
    },

    position: {
      type: String,
      enum: ['home', 'services', 'portfolio', 'about'],
      required: true,
      default: 'home'
    },

    orderIndex: {
      type: Number,
      required: true,
      default: 0
    },

    isVisible: {
      type: Boolean,
      default: true
    },

    displaySettings: {
      showOverlay: {
        type: Boolean,
        default: true
      },
      overlayOpacity: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.5
      },
      textPosition: {
        type: String,
        enum: ['left', 'center', 'right'],
        default: 'left'
      },
      textColor: {
        type: String,
        default: '#ffffff'
      }
    },

    schedule: {
      startDate: Date,
      endDate: Date,
      isScheduled: {
        type: Boolean,
        default: false
      }
    },

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

    ...baseSchemaFields
  },
  {
    timestamps: true,
    versionKey: false
  }
);

carouselSchema.index({ position: 1, orderIndex: 1 });
carouselSchema.index({ isVisible: 1 });
carouselSchema.index({ 'schedule.startDate': 1, 'schedule.endDate': 1 });
carouselSchema.index({ 'analytics.views': -1 });

Object.assign(carouselSchema.methods, baseSchemaMethods);
Object.assign(carouselSchema.statics, baseSchemaStatics);

// Track click
carouselSchema.methods.trackClick = function () {
  this.analytics.clicks += 1;
  this.analytics.ctr =
    this.analytics.views > 0 ? (this.analytics.clicks / this.analytics.views) * 100 : 0;
  return this.save();
};

// Track view
carouselSchema.methods.trackView = function () {
  this.analytics.views += 1;
  this.analytics.ctr =
    this.analytics.clicks > 0 ? (this.analytics.clicks / this.analytics.views) * 100 : 0;
  return this.save();
};

export const Carousel = mongoose.model('Carousel', carouselSchema);
