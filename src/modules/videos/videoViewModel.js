import mongoose from 'mongoose';
import { baseSchemaFields } from '../../shared/models/baseModel.js';

const videoViewSchema = new mongoose.Schema({
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
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
  // Watch time in seconds (how long user watched)
  watchTime: {
    type: Number,
    default: 0,
    min: 0
  },
  // Completion percentage (0-100)
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  ...baseSchemaFields
}, {
  timestamps: true,
  versionKey: false
});

// Ensure one view per video per user identifier
videoViewSchema.index({ video: 1, userIdentifier: 1 }, { unique: true });
// Index for analytics queries
videoViewSchema.index({ video: 1, createdAt: -1 });
videoViewSchema.index({ createdAt: -1 });
videoViewSchema.index({ watchTime: -1 });

export const VideoView = mongoose.model('VideoView', videoViewSchema);

