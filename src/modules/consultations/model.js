import mongoose from 'mongoose';
import {
  baseSchemaFields,
  baseSchemaMethods,
  baseSchemaStatics
} from '../../shared/models/baseModel.js';

const consultationSchema = new mongoose.Schema(
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

    company: {
      name: String,
      website: String,
      industry: String,
      size: {
        type: String,
        enum: ['startup', 'small', 'medium', 'large', 'enterprise']
      }
    },

    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true
      }
    ],

    projectDescription: {
      type: String,
      required: [true, 'شرح پروژه الزامی است'],
      trim: true,
      maxLength: [2000, 'شرح پروژه نمی‌تواند بیش از ۲۰۰۰ کاراکتر باشد']
    },

    budget: {
      type: String,
      required: true,
      enum: ['under-10m', '10m-50m', '50m-100m', '100m-500m', 'over-500m', 'custom']
    },

    timeline: {
      type: String,
      required: true,
      enum: ['asap', '1-month', '1-3months', '3-6months', '6months+', 'flexible']
    },

    preferredContactMethod: {
      type: String,
      required: true,
      enum: ['email', 'phone', 'telegram', 'video_call'],
      default: 'email'
    },

    preferredContactTime: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'anytime'],
      default: 'anytime'
    },

    requestStatus: {
      type: String,
      enum: [
        'new',
        'contacted',
        'in_discussion',
        'proposal_sent',
        'accepted',
        'rejected',
        'converted'
      ],
      default: 'new'
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // Link to user account (if user registered after consultation)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    followUps: [
      {
        date: {
          type: Date,
          required: true
        },
        method: {
          type: String,
          enum: ['email', 'phone', 'telegram', 'meeting'],
          required: true
        },
        notes: String,
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        nextFollowUp: Date
      }
    ],

    convertedToProject: {
      type: Boolean,
      default: false
    },

    projectValue: {
      type: Number,
      min: 0
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

    ...baseSchemaFields
  },
  {
    timestamps: true,
    versionKey: false
  }
);

consultationSchema.index({ email: 1 });
consultationSchema.index({ phoneNumber: 1 });
consultationSchema.index({ requestStatus: 1 });
consultationSchema.index({ assignedTo: 1 });
consultationSchema.index({ user: 1 });
consultationSchema.index({ services: 1 });
consultationSchema.index({ createdAt: -1 });
consultationSchema.index({ leadSource: 1 });
consultationSchema.index({ fullName: 'text', 'company.name': 'text' });

Object.assign(consultationSchema.methods, baseSchemaMethods);
Object.assign(consultationSchema.statics, baseSchemaStatics);

// Add follow-up
consultationSchema.methods.addFollowUp = function (followUpData) {
  this.followUps.push(followUpData);
  return this.save();
};

// Update status
consultationSchema.methods.updateStatus = function (status, userId) {
  this.requestStatus = status;
  this.updatedBy = userId;
  return this.save();
};

export const Consultation = mongoose.model('Consultation', consultationSchema);
