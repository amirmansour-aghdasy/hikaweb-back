import mongoose from 'mongoose';
import { baseSchemaFields, baseSchemaMethods, baseSchemaStatics } from '../../shared/models/baseModel.js';

/**
 * ProductLike Model
 * 
 * Stores user likes for products
 * Unlike bookmarks, likes are permanent (no soft delete)
 * Used for popularity metrics
 */
const productLikeSchema = new mongoose.Schema({
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
productLikeSchema.index({ user: 1, product: 1 }, { unique: true });

// Compound index for efficient queries
productLikeSchema.index({ product: 1, deletedAt: 1 });
productLikeSchema.index({ user: 1, deletedAt: 1, createdAt: -1 });

Object.assign(productLikeSchema.methods, baseSchemaMethods);
Object.assign(productLikeSchema.statics, baseSchemaStatics);

export const ProductLike = mongoose.model('ProductLike', productLikeSchema);

