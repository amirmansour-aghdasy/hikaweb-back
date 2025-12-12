import mongoose from 'mongoose';
import { baseSchemaFields } from '../../shared/models/baseModel.js';

const articleLikeSchema = new mongoose.Schema({
  article: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: true,
    index: true
  },
  // Store user ID if logged in
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  // Store IP address or device fingerprint for anonymous users
  userIdentifier: {
    type: String,
    required: true,
    index: true
  },
  ...baseSchemaFields
}, {
  timestamps: true,
  versionKey: false
});

// Ensure one like per article per user identifier
articleLikeSchema.index({ article: 1, userIdentifier: 1 }, { unique: true });
// Index for user-based queries
articleLikeSchema.index({ article: 1, user: 1 }, { unique: true, sparse: true });

export const ArticleLike = mongoose.model('ArticleLike', articleLikeSchema);

