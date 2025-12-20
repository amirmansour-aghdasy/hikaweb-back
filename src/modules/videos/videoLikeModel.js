import mongoose from 'mongoose';
import { baseSchemaFields } from '../../shared/models/baseModel.js';

const videoLikeSchema = new mongoose.Schema({
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
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

// Ensure one like per video per user identifier
videoLikeSchema.index({ video: 1, userIdentifier: 1 }, { unique: true });
// Index for user-based queries
videoLikeSchema.index({ video: 1, user: 1 }, { unique: true, sparse: true });

export const VideoLike = mongoose.model('VideoLike', videoLikeSchema);

