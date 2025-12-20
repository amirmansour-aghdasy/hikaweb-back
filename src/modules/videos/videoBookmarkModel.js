import mongoose from 'mongoose';
import { baseSchemaFields, baseSchemaMethods, baseSchemaStatics } from '../../shared/models/baseModel.js';

const videoBookmarkSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true,
    index: true
  },
  // Optional: note/comment for bookmark
  note: {
    type: String,
    maxLength: 500,
    trim: true
  },
  ...baseSchemaFields
}, {
  timestamps: true,
  versionKey: false
});

// Ensure unique user-video combination
videoBookmarkSchema.index({ user: 1, video: 1 }, { unique: true });

Object.assign(videoBookmarkSchema.methods, baseSchemaMethods);
Object.assign(videoBookmarkSchema.statics, baseSchemaStatics);

export const VideoBookmark = mongoose.model('VideoBookmark', videoBookmarkSchema);

