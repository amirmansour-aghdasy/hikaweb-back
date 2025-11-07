import mongoose from 'mongoose';
import {
  baseSchemaFields,
  baseSchemaMethods,
  baseSchemaStatics
} from '../../shared/models/baseModel.js';

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'comment_new',
        'comment_approved',
        'comment_rejected',
        'ticket_new',
        'ticket_assigned',
        'ticket_updated',
        'ticket_resolved',
        'consultation_new',
        'consultation_assigned',
        'user_registered',
        'article_published',
        'service_created',
        'portfolio_created',
        'task_assigned',
        'task_updated',
        'calendar_event',
        'system_alert',
        'other'
      ]
    },
    
    title: {
      fa: String,
      en: String
    },
    
    message: {
      fa: String,
      en: String
    },
    
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    relatedEntity: {
      type: {
        type: String,
        enum: ['comment', 'ticket', 'consultation', 'article', 'service', 'portfolio', 'user', 'other']
      },
      id: mongoose.Schema.Types.ObjectId
    },
    
    isRead: {
      type: Boolean,
      default: false
    },
    
    readAt: Date,
    
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    
    actionUrl: String,
    
    ...baseSchemaFields
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

// Methods
Object.assign(notificationSchema.methods, baseSchemaMethods);

// Statics
Object.assign(notificationSchema.statics, baseSchemaStatics);

export const Notification = mongoose.model('Notification', notificationSchema);

