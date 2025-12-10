import mongoose from 'mongoose';
import { baseSchemaFields } from '../../shared/models/baseModel.js';

const articleViewSchema = new mongoose.Schema({
  article: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: true,
    index: true
  },
  // Store IP address or device fingerprint for anonymous users
  userIdentifier: {
    type: String,
    required: true,
    index: true
  },
  // Optional: link to user if logged in
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  // IP address for analytics
  ip: {
    type: String,
    default: null
  },
  // User agent for analytics
  userAgent: {
    type: String,
    default: null
  },
  ...baseSchemaFields
}, {
  timestamps: true,
  versionKey: false
});

// Ensure one view per article per user identifier
articleViewSchema.index({ article: 1, userIdentifier: 1 }, { unique: true });
// Index for analytics queries
articleViewSchema.index({ article: 1, createdAt: -1 });
articleViewSchema.index({ createdAt: -1 });

export const ArticleView = mongoose.model('ArticleView', articleViewSchema);

