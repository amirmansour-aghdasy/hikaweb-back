import mongoose from 'mongoose';
import {
  baseSchemaFields,
  baseSchemaMethods,
  baseSchemaStatics
} from '../../shared/models/baseModel.js';

const contactMessageSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'نام و نام خانوادگی الزامی است'],
      trim: true,
      maxLength: [100, 'نام نمی‌تواند بیش از ۱۰۰ کاراکتر باشد']
    },

    email: {
      type: String,
      required: [true, 'ایمیل الزامی است'],
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'ایمیل معتبر وارد کنید']
    },

    phoneNumber: {
      type: String,
      required: [true, 'شماره موبایل الزامی است'],
      match: [/^(\+98|0)?9\d{9}$/, 'شماره موبایل معتبر وارد کنید']
    },

    message: {
      type: String,
      required: [true, 'پیام الزامی است'],
      trim: true,
      maxLength: [2000, 'پیام نمی‌تواند بیش از ۲۰۰۰ کاراکتر باشد']
    },

    status: {
      type: String,
      enum: ['new', 'read', 'archived'],
      default: 'new'
    },

    // Link to user account (if user registered)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    repliedAt: {
      type: Date,
      default: null
    },

    replyMessage: {
      type: String,
      trim: true
    },

    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    leadSource: {
      type: String,
      enum: ['website', 'referral', 'social_media', 'google_ads', 'direct', 'other'],
      default: 'website'
    },

    utmParams: {
      source: String,
      medium: String,
      campaign: String,
      term: String,
      content: String
    },

    internalNotes: [
      {
        note: String,
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    // Override baseSchemaFields status with our own status enum
    deletedAt: {
      type: Date,
      default: null
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

contactMessageSchema.index({ email: 1 });
contactMessageSchema.index({ phoneNumber: 1 });
contactMessageSchema.index({ status: 1 });
contactMessageSchema.index({ user: 1 });
contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.index({ leadSource: 1 });
contactMessageSchema.index({ fullName: 'text', message: 'text' });

Object.assign(contactMessageSchema.methods, baseSchemaMethods);
Object.assign(contactMessageSchema.statics, baseSchemaStatics);

// Mark as read
contactMessageSchema.methods.markAsRead = function (userId) {
  this.status = 'read';
  this.updatedBy = userId;
  return this.save();
};

// Note: Reply functionality removed - use ticket system instead

export const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);

