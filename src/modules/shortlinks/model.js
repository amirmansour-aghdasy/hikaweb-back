import mongoose from 'mongoose';
import { baseSchemaFields, baseSchemaMethods, baseSchemaStatics } from '../../shared/models/baseModel.js';

const shortLinkSchema = new mongoose.Schema(
  {
    shortCode: {
      type: String,
      required: [true, 'کد کوتاه الزامی است'],
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9_-]+$/, 'کد کوتاه فقط می‌تواند شامل حروف انگلیسی، اعداد، خط تیره و زیرخط باشد']
    },
    originalUrl: {
      type: String,
      required: [true, 'آدرس اصلی الزامی است'],
      trim: true,
      validate: {
        validator: function(v) {
          try {
            new URL(v);
            return true;
          } catch {
            return false;
          }
        },
        message: 'آدرس اصلی باید یک URL معتبر باشد'
      }
    },
    resourceType: {
      type: String,
      enum: ['article', 'service', 'portfolio', 'category', 'other'],
      default: 'other'
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'resourceType',
      default: null
    },
    clicks: {
      type: Number,
      default: 0
    },
    lastClickedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    metadata: {
      title: { fa: String, en: String },
      description: { fa: String, en: String }
    },
    ...baseSchemaFields
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes for performance
shortLinkSchema.index({ shortCode: 1 }, { unique: true });
shortLinkSchema.index({ resourceType: 1, resourceId: 1 });
shortLinkSchema.index({ isActive: 1, expiresAt: 1 });
shortLinkSchema.index({ createdAt: -1 });

// Add base schema methods and statics
Object.assign(shortLinkSchema.methods, baseSchemaMethods);
Object.assign(shortLinkSchema.statics, baseSchemaStatics);

const ShortLink = mongoose.model('ShortLink', shortLinkSchema);

export default ShortLink;

