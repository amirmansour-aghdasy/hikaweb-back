import mongoose from 'mongoose';
import {
  baseSchemaFields,
  baseSchemaMethods,
  baseSchemaStatics
} from '../../shared/models/baseModel.js';

const analyticsSchema = new mongoose.Schema(
  {
    // Page views and traffic
    pageViews: {
      type: Number,
      default: 0
    },
    uniqueVisitors: {
      type: Number,
      default: 0
    },
    sessions: {
      type: Number,
      default: 0
    },
    
    // User engagement
    avgSessionDuration: {
      type: Number, // in seconds
      default: 0
    },
    bounceRate: {
      type: Number, // percentage
      default: 0
    },
    
    // Content metrics
    articlesViews: {
      type: Number,
      default: 0
    },
    servicesViews: {
      type: Number,
      default: 0
    },
    portfolioViews: {
      type: Number,
      default: 0
    },
    
    // User actions
    commentsCount: {
      type: Number,
      default: 0
    },
    consultationsCount: {
      type: Number,
      default: 0
    },
    ticketsCount: {
      type: Number,
      default: 0
    },
    
    // Date tracking
    date: {
      type: Date,
      required: true
    },
    
    // Referrer and source
    referrer: String,
    source: {
      type: String,
      enum: ['direct', 'organic', 'social', 'email', 'referral', 'other']
    },
    
    ...baseSchemaFields
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes for efficient queries
analyticsSchema.index({ date: 1 });
analyticsSchema.index({ createdAt: 1 });

// Methods
Object.assign(analyticsSchema.methods, baseSchemaMethods);

// Statics
Object.assign(analyticsSchema.statics, baseSchemaStatics);

export const Analytics = mongoose.model('Analytics', analyticsSchema);

