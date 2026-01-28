import mongoose from 'mongoose';
import {
  baseSchemaFields,
  baseSchemaMethods,
  baseSchemaStatics
} from '../../shared/models/baseModel.js';

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    displayName: {
      fa: { type: String, required: true },
      en: { type: String, required: true }
    },
    description: {
      fa: String,
      en: String
    },
    permissions: [
      {
        type: String,
        enum: [
          'users.create',
          'users.read',
          'users.update',
          'users.delete',
          'roles.create',
          'roles.read',
          'roles.update',
          'roles.delete',
          'articles.create',
          'articles.read',
          'articles.update',
          'articles.delete',
          'services.create',
          'services.read',
          'services.update',
          'services.delete',
          'portfolio.create',
          'portfolio.read',
          'portfolio.update',
          'portfolio.delete',
          'team.create',
          'team.read',
          'team.update',
          'team.delete',
          'faq.create',
          'faq.read',
          'faq.update',
          'faq.delete',
          'brands.create',
          'brands.read',
          'brands.update',
          'brands.delete',
          'carousel.create',
          'carousel.read',
          'carousel.update',
          'carousel.delete',
          'categories.create',
          'categories.read',
          'categories.update',
          'categories.delete',
          'comments.create',
          'comments.read',
          'comments.update',
          'comments.delete',
          'comments.moderate',
          'tickets.create',
          'tickets.read',
          'tickets.update',
          'tickets.delete',
          'tickets.assign',
          'consultations.read',
          'consultations.update',
          'consultations.delete',
          'media.create',
          'media.read',
          'media.update',
          'media.delete',
          'products.create',
          'products.read',
          'products.update',
          'products.delete',
          'orders.create',
          'orders.read',
          'orders.update',
          'orders.delete',
          'settings.read',
          'settings.update',
          'admin.all'
        ]
      }
    ],
    isSystem: {
      type: Boolean,
      default: false
    },
    priority: {
      type: Number,
      default: 0
    },
    ...baseSchemaFields
  },
  {
    timestamps: true,
    versionKey: false
  }
);

Object.assign(roleSchema.methods, baseSchemaMethods);
Object.assign(roleSchema.statics, baseSchemaStatics);

export const Role = mongoose.model('Role', roleSchema);
