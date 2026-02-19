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
      lowercase: true
      // یونیک فقط برای سندهای غیرحذف‌شده؛ از طریق ایندکس partialFilterExpression پایین
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

// یونیک فقط برای حساب‌های غیرحذف‌شده تا بعد از حذف نرم بتوان همان آدرس را دوباره ثبت کرد
emailAccountSchema.index(
  { address: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);
emailAccountSchema.index({ deletedAt: 1 });
emailAccountSchema.index({ isDefault: 1 });

Object.assign(emailAccountSchema.methods, baseSchemaMethods);
Object.assign(emailAccountSchema.statics, baseSchemaStatics);

/**
 * حذف ایندکس قدیمی یونیک address (بدون partial) تا بتوان بعد از حذف نرم همان آدرس را دوباره ثبت کرد.
 * یک بار بعد از دیپلوی کافی است.
 */
export async function ensureEmailAccountAddressIndex() {
  const coll = EmailAccount.collection;
  const indexes = await coll.indexes();
  const oldAddressIndex = indexes.find(
    (idx) => idx.key?.address === 1 && !idx.partialFilterExpression
  );
  if (oldAddressIndex && oldAddressIndex.name) {
    await coll.dropIndex(oldAddressIndex.name);
    // eslint-disable-next-line no-console
    console.log(`Dropped old email account index: ${oldAddressIndex.name}`);
  }
}

export const EmailAccount = mongoose.model('EmailAccount', emailAccountSchema);
