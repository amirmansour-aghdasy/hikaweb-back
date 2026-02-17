import mongoose from 'mongoose';

const sentEmailSchema = new mongoose.Schema(
  {
    fromAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmailAccount',
      required: true
    },
    fromAddress: {
      type: String,
      required: true
    },
    to: [{ type: String, trim: true }],
    cc: [{ type: String, trim: true }],
    bcc: [{ type: String, trim: true }],
    subject: {
      type: String,
      required: true,
      trim: true
    },
    bodyHtml: { type: String, default: '' },
    bodyText: { type: String, default: '' },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

sentEmailSchema.index({ fromAccount: 1, createdAt: -1 });
sentEmailSchema.index({ sentBy: 1, createdAt: -1 });

export const SentEmail = mongoose.model('SentEmail', sentEmailSchema);
