import mongoose from 'mongoose';
import {
  baseSchemaFields,
  baseSchemaMethods,
  baseSchemaStatics
} from '../../shared/models/baseModel.js';

const emailAccountSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: [true, 'آدرس ایمیل الزامی است'],
      trim: true,
      lowercase: true,
      unique: true
    },
    displayName: {
      type: String,
      trim: true,
      default: ''
    },
    smtpHost: {
      type: String,
      required: [true, 'سرور SMTP الزامی است'],
      trim: true
    },
    smtpPort: {
      type: Number,
      required: true,
      default: 587
    },
    smtpSecure: {
      type: Boolean,
      default: false
    },
    smtpUser: {
      type: String,
      required: [true, 'نام کاربری SMTP الزامی است'],
      trim: true
    },
    smtpPasswordEncrypted: {
      type: String,
      required: [true, 'رمز عبور SMTP الزامی است'],
      select: false
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    // IMAP (optional - for inbox; if not set, inbox is disabled for this account)
    imapHost: { type: String, trim: true, default: '' },
    imapPort: { type: Number, default: 993 },
    imapSecure: { type: Boolean, default: true },
    ...baseSchemaFields
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

emailAccountSchema.index({ address: 1 }, { unique: true });
emailAccountSchema.index({ deletedAt: 1 });
emailAccountSchema.index({ isDefault: 1 });

Object.assign(emailAccountSchema.methods, baseSchemaMethods);
Object.assign(emailAccountSchema.statics, baseSchemaStatics);

export const EmailAccount = mongoose.model('EmailAccount', emailAccountSchema);
