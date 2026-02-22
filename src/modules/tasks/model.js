import mongoose from 'mongoose';
import {
  baseSchemaFields,
  baseSchemaMethods,
  baseSchemaStatics
} from '../../shared/models/baseModel.js';

// Task has its own status (pending/in_progress/completed/cancelled); exclude base status (active/inactive/archived)
const { status: _baseStatus, ...restBaseFields } = baseSchemaFields;

const taskSchema = new mongoose.Schema(
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
    
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    assigner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
      index: true
    },
    
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true
    },
    
    dueDate: {
      type: Date,
      index: true
    },
    
    completedAt: Date,
    
    cancelledAt: Date,
    
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
    
    comments: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      content: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    notifications: {
      dashboard: {
        type: Boolean,
        default: true
      },
      email: {
        type: Boolean,
        default: false
      },
      sms: {
        type: Boolean,
        default: false
      }
    },
    
    reminderSent: {
      type: Boolean,
      default: false
    },
    
    ...restBaseFields
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes for efficient queries
taskSchema.index({ assignee: 1, status: 1, createdAt: -1 });
taskSchema.index({ assigner: 1, createdAt: -1 });
taskSchema.index({ status: 1, priority: 1, dueDate: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ createdAt: -1 });

// Methods
Object.assign(taskSchema.methods, baseSchemaMethods);

// Statics
Object.assign(taskSchema.statics, baseSchemaStatics);

export const Task = mongoose.model('Task', taskSchema);

