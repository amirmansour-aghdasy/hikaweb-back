import mongoose from 'mongoose';
import {
  baseSchemaFields,
  baseSchemaMethods,
  baseSchemaStatics
} from '../../shared/models/baseModel.js';

const calendarEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 200
    },
    
    description: {
      type: String,
      trim: true
    },
    
    startDate: {
      type: Date,
      required: true,
      index: true
    },
    
    endDate: {
      type: Date,
      index: true
    },
    
    isAllDay: {
      type: Boolean,
      default: false
    },
    
    location: {
      type: String,
      trim: true
    },
    
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    attendees: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'tentative'],
        default: 'pending'
      },
      respondedAt: Date
    }],
    
    type: {
      type: String,
      enum: ['meeting', 'event', 'reminder', 'deadline', 'holiday', 'other'],
      default: 'event',
      index: true
    },
    
    color: {
      type: String,
      default: '#1976d2'
    },
    
    reminders: [{
      type: {
        type: String,
        enum: ['dashboard', 'email', 'sms'],
        required: true
      },
      minutesBefore: {
        type: Number,
        required: true
      },
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date
    }],
    
    recurrence: {
      enabled: {
        type: Boolean,
        default: false
      },
      pattern: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'yearly']
      },
      interval: {
        type: Number,
        default: 1
      },
      endDate: Date,
      occurrences: Number
    },
    
    tags: [{
      type: String,
      trim: true
    }],
    
    attachments: [{
      url: String,
      name: String,
      size: Number,
      type: String
    }],
    
    ...baseSchemaFields
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes for efficient queries
calendarEventSchema.index({ organizer: 1, startDate: 1 });
calendarEventSchema.index({ 'attendees.user': 1, startDate: 1 });
calendarEventSchema.index({ startDate: 1, endDate: 1 });
calendarEventSchema.index({ type: 1, startDate: 1 });
calendarEventSchema.index({ startDate: 1 });

// Methods
Object.assign(calendarEventSchema.methods, baseSchemaMethods);

// Statics
Object.assign(calendarEventSchema.statics, baseSchemaStatics);

export const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);

