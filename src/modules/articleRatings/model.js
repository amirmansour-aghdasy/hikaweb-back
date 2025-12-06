import mongoose from 'mongoose';
import { baseSchemaFields } from '../../shared/models/baseModel.js';

const articleRatingSchema = new mongoose.Schema({
  article: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: true,
    index: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
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
  ...baseSchemaFields
}, {
  timestamps: true,
  versionKey: false
});

// Ensure one rating per article per user identifier
articleRatingSchema.index({ article: 1, userIdentifier: 1 }, { unique: true });

export const ArticleRating = mongoose.model('ArticleRating', articleRatingSchema);

