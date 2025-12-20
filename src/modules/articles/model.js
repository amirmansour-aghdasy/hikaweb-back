import mongoose from 'mongoose';
import { baseSchemaFields, baseSchemaMethods, baseSchemaStatics } from '../../shared/models/baseModel.js';

const articleSchema = new mongoose.Schema({
  title: {
    fa: { type: String, required: true, trim: true, maxLength: 200 },
    en: { type: String, required: true, trim: true, maxLength: 200 }
  },
  slug: {
    fa: { type: String, required: false, lowercase: true },
    en: { type: String, required: false, lowercase: true }
  },
  excerpt: {
    fa: { type: String, maxLength: 500 },
    en: { type: String, maxLength: 500 }
  },
  content: {
    fa: { type: String, required: true },
    en: { type: String, required: true }
  },
  featuredImage: String,
  gallery: [{
    url: String,
    alt: { fa: String, en: String },
    caption: { fa: String, en: String }
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  tags: {
    fa: [String],
    en: [String]
  },
  publishedAt: Date,
  isPublished: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  readTime: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  // Rating system (without login)
  ratings: {
    total: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
    average: { type: Number, default: 0 }
  },
  seo: {
    metaTitle: { fa: String, en: String },
    metaDescription: { fa: String, en: String },
    metaKeywords: { fa: [String], en: [String] },
    ogImage: String
  },
  downloadBox: {
    title: { fa: String, en: String },
    description: { fa: String, en: String },
    fileUrl: String,
    fileName: String,
    fileSize: Number,
    fileType: String,
    isActive: { type: Boolean, default: false }
  },
  ...baseSchemaFields
}, {
  timestamps: true,
  versionKey: false
});

// Partial indexes: only index documents where deletedAt is null
// This ensures unique slugs only for non-deleted articles
articleSchema.index(
  { 'slug.fa': 1 },
  { 
    unique: true, 
    partialFilterExpression: { deletedAt: null }
  }
);
articleSchema.index(
  { 'slug.en': 1 },
  { 
    unique: true, 
    partialFilterExpression: { deletedAt: null }
  }
);
articleSchema.index({ author: 1 });
articleSchema.index({ categories: 1 });
articleSchema.index({ isPublished: 1 });
articleSchema.index({ 'title.fa': 'text', 'content.fa': 'text' });

Object.assign(articleSchema.methods, baseSchemaMethods);
Object.assign(articleSchema.statics, baseSchemaStatics);

articleSchema.methods.calculateReadTime = function() {
  // For Persian/Farsi content, use 150 words per minute (slower reading speed)
  // For English content, use 200 words per minute (standard reading speed)
  const persianWordsPerMinute = 150;
  const englishWordsPerMinute = 200;
  
  // Count words in each language
  const persianWords = (this.content.fa || '').trim().split(/\s+/).filter(w => w.length > 0).length;
  const englishWords = (this.content.en || '').trim().split(/\s+/).filter(w => w.length > 0).length;
  
  // Calculate read time for each language
  const persianTime = persianWords > 0 ? Math.ceil(persianWords / persianWordsPerMinute) : 0;
  const englishTime = englishWords > 0 ? Math.ceil(englishWords / englishWordsPerMinute) : 0;
  
  // Total read time (sum of both languages)
  this.readTime = Math.max(1, persianTime + englishTime); // Minimum 1 minute
  return this.readTime;
};

// Calculate average rating
articleSchema.methods.calculateAverageRating = function() {
  if (this.ratings.count > 0) {
    this.ratings.average = Math.round((this.ratings.total / this.ratings.count) * 10) / 10;
  } else {
    this.ratings.average = 0;
  }
  return this.ratings.average;
};

articleSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    this.calculateReadTime();
  }
  if (this.isModified('ratings.total') || this.isModified('ratings.count')) {
    this.calculateAverageRating();
  }
  next();
});

export const Article = mongoose.model('Article', articleSchema);
