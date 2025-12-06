import mongoose from 'mongoose';
import { baseSchemaFields, baseSchemaMethods, baseSchemaStatics } from '../../shared/models/baseModel.js';

const articleSchema = new mongoose.Schema({
  title: {
    fa: { type: String, required: true, trim: true, maxLength: 200 },
    en: { type: String, required: true, trim: true, maxLength: 200 }
  },
  slug: {
    fa: { type: String, required: true, lowercase: true },
    en: { type: String, required: true, lowercase: true }
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
  ...baseSchemaFields
}, {
  timestamps: true,
  versionKey: false
});

articleSchema.index({ 'slug.fa': 1 }, { unique: true, sparse: true });
articleSchema.index({ 'slug.en': 1 }, { unique: true, sparse: true });
articleSchema.index({ author: 1 });
articleSchema.index({ categories: 1 });
articleSchema.index({ isPublished: 1 });
articleSchema.index({ 'title.fa': 'text', 'content.fa': 'text' });

Object.assign(articleSchema.methods, baseSchemaMethods);
Object.assign(articleSchema.statics, baseSchemaStatics);

articleSchema.methods.calculateReadTime = function() {
  const wordsPerMinute = 200;
  const totalWords = (this.content.fa + ' ' + this.content.en).split(' ').length;
  this.readTime = Math.ceil(totalWords / wordsPerMinute);
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
