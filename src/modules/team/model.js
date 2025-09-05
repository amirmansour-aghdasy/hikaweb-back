import mongoose from 'mongoose';
import {
  baseSchemaFields,
  baseSchemaMethods,
  baseSchemaStatics
} from '../../shared/models/baseModel.js';

const teamMemberSchema = new mongoose.Schema(
  {
    name: {
      fa: {
        type: String,
        required: [true, 'نام فارسی الزامی است'],
        trim: true,
        maxLength: [100, 'نام نمی‌تواند بیش از ۱۰۰ کاراکتر باشد']
      },
      en: {
        type: String,
        required: [true, 'نام انگلیسی الزامی است'],
        trim: true,
        maxLength: [100, 'نام نمی‌تواند بیش از ۱۰۰ کاراکتر باشد']
      }
    },

    position: {
      fa: {
        type: String,
        required: [true, 'سمت فارسی الزامی است'],
        trim: true
      },
      en: {
        type: String,
        required: [true, 'سمت انگلیسی الزامی است'],
        trim: true
      }
    },

    bio: {
      fa: {
        type: String,
        trim: true
      },
      en: {
        type: String,
        trim: true
      }
    },

    avatar: {
      type: String,
      required: [true, 'تصویر پروفایل الزامی است']
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'ایمیل معتبر وارد کنید']
    },

    phone: {
      type: String,
      trim: true
    },

    socialLinks: {
      linkedin: String,
      twitter: String,
      instagram: String,
      telegram: String,
      github: String,
      behance: String,
      dribbble: String
    },

    skills: [
      {
        name: {
          fa: String,
          en: String
        },
        level: {
          type: Number,
          min: 1,
          max: 5,
          default: 3
        }
      }
    ],

    experience: {
      years: {
        type: Number,
        min: 0,
        default: 0
      },
      description: {
        fa: String,
        en: String
      }
    },

    department: {
      type: String,
      enum: ['management', 'development', 'design', 'marketing', 'sales', 'support'],
      required: true
    },

    orderIndex: {
      type: Number,
      default: 0
    },

    isPublic: {
      type: Boolean,
      default: true
    },

    joinDate: {
      type: Date,
      default: Date.now
    },

    ...baseSchemaFields
  },
  {
    timestamps: true,
    versionKey: false
  }
);

teamMemberSchema.index({ department: 1, orderIndex: 1 });
teamMemberSchema.index({ isPublic: 1 });
teamMemberSchema.index({ 'name.fa': 'text', 'position.fa': 'text' });
teamMemberSchema.index({ 'name.en': 'text', 'position.en': 'text' });

Object.assign(teamMemberSchema.methods, baseSchemaMethods);
Object.assign(teamMemberSchema.statics, baseSchemaStatics);

export const TeamMember = mongoose.model('TeamMember', teamMemberSchema);
