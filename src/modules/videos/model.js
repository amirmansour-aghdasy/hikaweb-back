import mongoose from 'mongoose';
import { baseSchemaFields, baseSchemaMethods, baseSchemaStatics } from '../../shared/models/baseModel.js';

const videoSchema = new mongoose.Schema({
  title: {
    fa: { type: String, required: true, trim: true, maxLength: 200 },
    en: { type: String, required: true, trim: true, maxLength: 200 }
  },
  slug: {
    fa: { type: String, required: true, lowercase: true },
    en: { type: String, required: true, lowercase: true }
  },
  description: {
    fa: { type: String, maxLength: 2000 },
    en: { type: String, maxLength: 2000 }
  },
  shortDescription: {
    fa: { type: String, maxLength: 500 },
    en: { type: String, maxLength: 500 }
  },
  // Video file URL (from media storage)
  videoUrl: {
    type: String,
    required: true
  },
  // Thumbnail/Cover image
  thumbnailUrl: {
    type: String,
    required: true
  },
  // Video duration in seconds
  duration: {
    type: Number,
    required: true,
    min: 0
  },
  // Video file size in bytes
  fileSize: {
    type: Number,
    min: 0
  },
  // Video quality/resolution
  quality: {
    type: String,
    enum: ['360p', '480p', '720p', '1080p', '1440p', '2160p', 'auto'],
    default: 'auto'
  },
  // Video format
  format: {
    type: String,
    enum: ['mp4', 'webm', 'm3u8', 'other'],
    default: 'mp4'
  },
  // Author/Creator
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Categories
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  // Tags
  tags: {
    fa: [String],
    en: [String]
  },
  // Related services
  relatedServices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  // Related portfolios
  relatedPortfolios: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Portfolio'
  }],
  // Related articles
  relatedArticles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article'
  }],
  // Publishing
  publishedAt: Date,
  isPublished: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  // Statistics
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  bookmarks: { type: Number, default: 0 },
  // Rating system
  ratings: {
    total: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
    average: { type: Number, default: 0 }
  },
  // Video metadata
  metadata: {
    width: Number,
    height: Number,
    fps: Number,
    codec: String,
    bitrate: Number
  },
  // SEO
  seo: {
    metaTitle: { fa: String, en: String },
    metaDescription: { fa: String, en: String },
    metaKeywords: { fa: [String], en: [String] },
    ogImage: String
  },
  // Video info box (like YouTube's info section) - always active
  infoBox: {
    title: { fa: String, en: String },
    content: { fa: String, en: String }
  },
  ...baseSchemaFields
}, {
  timestamps: true,
  versionKey: false
});

// Indexes
// Partial indexes: only index documents where deletedAt is null
videoSchema.index(
  { 'slug.fa': 1 },
  { 
    unique: true, 
    partialFilterExpression: { deletedAt: null }
  }
);
videoSchema.index(
  { 'slug.en': 1 },
  { 
    unique: true, 
    partialFilterExpression: { deletedAt: null }
  }
);
videoSchema.index({ author: 1 });
videoSchema.index({ categories: 1 });
videoSchema.index({ isPublished: 1 });
videoSchema.index({ isFeatured: 1 });
videoSchema.index({ views: -1 });
videoSchema.index({ likes: -1 });
videoSchema.index({ publishedAt: -1 });
videoSchema.index({ 'title.fa': 'text', 'description.fa': 'text' });
videoSchema.index({ 'title.en': 'text', 'description.en': 'text' });

Object.assign(videoSchema.methods, baseSchemaMethods);
Object.assign(videoSchema.statics, baseSchemaStatics);

// Calculate average rating
videoSchema.methods.calculateAverageRating = function() {
  if (this.ratings.count > 0) {
    this.ratings.average = Math.round((this.ratings.total / this.ratings.count) * 10) / 10;
  } else {
    this.ratings.average = 0;
  }
  return this.ratings.average;
};

// Format duration (e.g., 125 -> "2:05")
videoSchema.methods.formatDuration = function() {
  const minutes = Math.floor(this.duration / 60);
  const seconds = this.duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

videoSchema.pre('save', function(next) {
  if (this.isModified('ratings.total') || this.isModified('ratings.count')) {
    this.calculateAverageRating();
  }
  next();
});

export const Video = mongoose.model('Video', videoSchema);

