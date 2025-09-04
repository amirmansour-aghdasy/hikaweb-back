import mongoose from 'mongoose';
import {
  baseSchemaFields,
  baseSchemaMethods,
  baseSchemaStatics
} from '../../shared/models/BaseModel.js';

const mediaSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: [true, 'نام فایل الزامی است'],
      trim: true
    },

    originalName: {
      type: String,
      required: [true, 'نام اصلی فایل الزامی است'],
      trim: true
    },

    title: {
      fa: String,
      en: String
    },

    altText: {
      fa: String,
      en: String
    },

    caption: {
      fa: String,
      en: String
    },

    description: {
      fa: String,
      en: String
    },

    url: {
      type: String,
      required: [true, 'آدرس فایل الزامی است']
    },

    thumbnailUrl: {
      type: String
    },

    mimeType: {
      type: String,
      required: [true, 'نوع فایل الزامی است']
    },

    fileType: {
      type: String,
      required: true,
      enum: ['image', 'video', 'audio', 'document', 'archive', 'other']
    },

    size: {
      type: Number,
      required: true,
      min: 0
    },

    dimensions: {
      width: Number,
      height: Number
    },

    duration: {
      type: Number // For video/audio in seconds
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    folder: {
      type: String,
      default: '/',
      trim: true
    },

    tags: [String],

    variants: [
      {
        size: String, // 'thumbnail', 'small', 'medium', 'large'
        url: String,
        width: Number,
        height: Number,
        fileSize: Number
      }
    ],

    usageCount: {
      type: Number,
      default: 0
    },

    usedIn: [
      {
        resourceType: {
          type: String,
          enum: ['Article', 'Service', 'Portfolio', 'TeamMember', 'Brand', 'Carousel']
        },
        resourceId: mongoose.Schema.Types.ObjectId,
        field: String
      }
    ],

    seo: {
      metaTitle: {
        fa: String,
        en: String
      },
      metaDescription: {
        fa: String,
        en: String
      }
    },

    ...baseSchemaFields
  },
  {
    timestamps: true,
    versionKey: false
  }
);

mediaSchema.index({ uploadedBy: 1 });
mediaSchema.index({ fileType: 1 });
mediaSchema.index({ mimeType: 1 });
mediaSchema.index({ folder: 1 });
mediaSchema.index({ createdAt: -1 });
mediaSchema.index({ usageCount: -1 });
mediaSchema.index({ originalName: 'text', 'title.fa': 'text', 'title.en': 'text' });

Object.assign(mediaSchema.methods, baseSchemaMethods);
Object.assign(mediaSchema.statics, baseSchemaStatics);

// Track usage
mediaSchema.methods.trackUsage = function (resourceType, resourceId, field) {
  const existingUsage = this.usedIn.find(
    usage =>
      usage.resourceType === resourceType &&
      usage.resourceId.toString() === resourceId &&
      usage.field === field
  );

  if (!existingUsage) {
    this.usedIn.push({ resourceType, resourceId, field });
    this.usageCount += 1;
    return this.save();
  }
};

// Remove usage tracking
mediaSchema.methods.removeUsage = function (resourceType, resourceId, field) {
  const index = this.usedIn.findIndex(
    usage =>
      usage.resourceType === resourceType &&
      usage.resourceId.toString() === resourceId &&
      usage.field === field
  );

  if (index > -1) {
    this.usedIn.splice(index, 1);
    this.usageCount = Math.max(0, this.usageCount - 1);
    return this.save();
  }
};

export const Media = mongoose.model('Media', mediaSchema);
