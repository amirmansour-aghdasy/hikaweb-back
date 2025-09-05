import mongoose from 'mongoose';
import { baseSchemaFields, baseSchemaMethods, baseSchemaStatics } from '../../shared/models/baseModel.js';

const serviceSchema = new mongoose.Schema({
  name: {
    fa: { type: String, required: true, trim: true, maxLength: 200 },
    en: { type: String, required: true, trim: true, maxLength: 200 }
  },
  slug: {
    fa: { type: String, required: true, lowercase: true },
    en: { type: String, required: true, lowercase: true }
  },
  description: {
    fa: { type: String, required: true },
    en: { type: String, required: true }
  },
  shortDescription: {
    fa: { type: String, maxLength: 300 },
    en: { type: String, maxLength: 300 }
  },
  icon: String,
  featuredImage: String,
  gallery: [{
    url: String,
    alt: { fa: String, en: String },
    caption: { fa: String, en: String }
  }],
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  processSteps: [{
    title: { fa: String, en: String },
    description: { fa: String, en: String },
    icon: String,
    order: Number
  }],
  features: [{
    title: { fa: String, en: String },
    description: { fa: String, en: String },
    icon: String
  }],
  pricing: {
    startingPrice: { type: Number, min: 0 },
    currency: { type: String, default: 'IRR', enum: ['IRR', 'USD', 'EUR'] },
    isCustom: { type: Boolean, default: false },
    packages: [{
      name: { fa: String, en: String },
      price: Number,
      features: [{ fa: String, en: String }],
      duration: String,
      isPopular: { type: Boolean, default: false }
    }]
  },
  relatedCaseStudies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Portfolio'
  }],
  relatedArticles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article'
  }],
  technologies: [{
    name: String,
    icon: String,
    description: { fa: String, en: String }
  }],
  deliverables: [{
    title: { fa: String, en: String },
    description: { fa: String, en: String }
  }],
  duration: {
    min: Number,
    max: Number,
    description: { fa: String, en: String }
  },
  orderIndex: { type: Number, default: 0 },
  isPopular: { type: Boolean, default: false },
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

// Fixed: Combined unique index instead of separate ones
serviceSchema.index({ 'slug.fa': 1 }, { unique: true, sparse: true });
serviceSchema.index({ 'slug.en': 1 }, { unique: true, sparse: true });
serviceSchema.index({ categories: 1 });
serviceSchema.index({ orderIndex: 1 });
serviceSchema.index({ 'name.fa': 'text', 'description.fa': 'text' });

Object.assign(serviceSchema.methods, baseSchemaMethods);
Object.assign(serviceSchema.statics, baseSchemaStatics);

export const Service = mongoose.model('Service', serviceSchema);