import mongoose from 'mongoose';
import { baseSchemaFields, baseSchemaMethods, baseSchemaStatics } from '../../shared/models/baseModel.js';

const bookmarkSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  article: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: true,
    index: true
  },
  ...baseSchemaFields
}, {
  timestamps: true,
  versionKey: false
});

// Ensure unique user-article combination
bookmarkSchema.index({ user: 1, article: 1 }, { unique: true });

Object.assign(bookmarkSchema.methods, baseSchemaMethods);
Object.assign(bookmarkSchema.statics, baseSchemaStatics);

export const Bookmark = mongoose.model('Bookmark', bookmarkSchema);

