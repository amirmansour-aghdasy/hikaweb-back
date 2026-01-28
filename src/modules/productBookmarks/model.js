import mongoose from 'mongoose';
import { baseSchemaFields, baseSchemaMethods, baseSchemaStatics } from '../../shared/models/baseModel.js';

/**
 * ProductBookmark Model
 * 
 * Stores user bookmarks for products
 * Supports soft delete for bookmark history
 */
const productBookmarkSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  ...baseSchemaFields
}, {
  timestamps: true,
  versionKey: false
});

// Ensure unique user-product combination
productBookmarkSchema.index({ user: 1, product: 1 }, { unique: true });

// Compound index for efficient queries
productBookmarkSchema.index({ user: 1, deletedAt: 1, createdAt: -1 });

Object.assign(productBookmarkSchema.methods, baseSchemaMethods);
Object.assign(productBookmarkSchema.statics, baseSchemaStatics);

export const ProductBookmark = mongoose.model('ProductBookmark', productBookmarkSchema);

