import mongoose from 'mongoose';
import {
  baseSchemaFields,
  baseSchemaMethods,
  baseSchemaStatics
} from '../../shared/models/baseModel.js';

const portfolioSchema = new mongoose.Schema(
  {
    title: {
      fa: { type: String, required: true, trim: true, maxLength: 200 },
      en: { type: String, required: true, trim: true, maxLength: 200 }
    },
    slug: {
      fa: { type: String, required: true, unique: true, lowercase: true },
      en: { type: String, required: true, unique: true, lowercase: true }
    },
    description: {
      fa: { type: String, required: true },
      en: { type: String, required: true }
    },
    shortDescription: {
      fa: { type: String, maxLength: 300 },
      en: { type: String, maxLength: 300 }
    },
    client: {
      name: { type: String, required: true },
      logo: String,
      website: String,
      industry: { fa: String, en: String },
      size: { type: String, enum: ['startup', 'small', 'medium', 'large', 'enterprise'] }
    },
    project: {
      duration: { type: Number, required: true },
      budget: { type: String, enum: ['under-1m', '1m-5m', '5m-10m', '10m-50m', 'over-50m'] },
      completedAt: { type: Date, required: true },
      projectType: { fa: String, en: String }
    },
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service'
      }
    ],
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
      }
    ],
    toolsUsed: [
      {
        name: String,
        icon: String,
        category: String
      }
    ],
    featuredImage: { type: String, required: true },
    gallery: [
      {
        url: String,
        type: { type: String, enum: ['image', 'video'], default: 'image' },
        alt: { fa: String, en: String },
        caption: { fa: String, en: String },
        order: { type: Number, default: 0 }
      }
    ],
    results: [
      {
        metric: { fa: String, en: String },
        value: String,
        improvement: String,
        icon: String
      }
    ],
    testimonial: {
      content: { fa: String, en: String },
      clientName: String,
      clientPosition: String,
      clientAvatar: String,
      rating: { type: Number, min: 1, max: 5 }
    },
    challenges: [
      {
        title: { fa: String, en: String },
        description: { fa: String, en: String },
        solution: { fa: String, en: String }
      }
    ],
    orderIndex: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    seo: {
      metaTitle: { fa: String, en: String },
      metaDescription: { fa: String, en: String },
      metaKeywords: { fa: [String], en: [String] },
      ogImage: String
    },
    ...baseSchemaFields
  },
  {
    timestamps: true,
    versionKey: false
  }
);

portfolioSchema.index({ 'slug.fa': 1 });
portfolioSchema.index({ 'slug.en': 1 });
portfolioSchema.index({ services: 1 });
portfolioSchema.index({ categories: 1 });
portfolioSchema.index({ isFeatured: -1 });

Object.assign(portfolioSchema.methods, baseSchemaMethods);
Object.assign(portfolioSchema.statics, baseSchemaStatics);

export const Portfolio = mongoose.model('Portfolio', portfolioSchema);
