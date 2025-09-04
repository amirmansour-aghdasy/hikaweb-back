import mongoose from 'mongoose';
import { baseSchemaFields, baseSchemaMethods, baseSchemaStatics } from '../../shared/models/BaseModel.js';

const categorySchema = new mongoose.Schema({
  name: {
    fa: { type: String, required: true, trim: true, maxLength: 100 },
    en: { type: String, required: true, trim: true, maxLength: 100 }
  },
  slug: {
    fa: { type: String, required: true, lowercase: true },
    en: { type: String, required: true, lowercase: true }
  },
  description: {
    fa: String,
    en: String
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  level: { type: Number, default: 0, min: 0, max: 2 },
  icon: String,
  color: { type: String, default: '#000000' },
  orderIndex: { type: Number, default: 0 },
  type: {
    type: String,
    required: true,
    enum: ['article', 'service', 'portfolio', 'faq'],
    default: 'article'
  },
  seo: {
    metaTitle: { fa: String, en: String },
    metaDescription: { fa: String, en: String },
    metaKeywords: { fa: [String], en: [String] }
  },
  ...baseSchemaFields
}, {
  timestamps: true,
  versionKey: false
});

categorySchema.index({ type: 1, level: 1 });
categorySchema.index({ parent: 1, orderIndex: 1 });
categorySchema.index({ 'slug.fa': 1, type: 1 }, { unique: true });
categorySchema.index({ 'slug.en': 1, type: 1 }, { unique: true });

Object.assign(categorySchema.methods, baseSchemaMethods);
Object.assign(categorySchema.statics, baseSchemaStatics);

categorySchema.pre('save', async function(next) {
  if (this.parent) {
    const parent = await this.constructor.findById(this.parent);
    if (parent) {
      this.level = parent.level + 1;
      if (this.level > 2) {
        return next(new Error('Category nesting cannot exceed 3 levels'));
      }
    }
  } else {
    this.level = 0;
  }
  next();
});

export const Category = mongoose.model('Category', categorySchema);