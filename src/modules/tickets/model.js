import mongoose from 'mongoose';
import {
  baseSchemaFields,
  baseSchemaMethods,
  baseSchemaStatics
} from '../../shared/models/baseModel.js';

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: false // Will be auto-generated in pre-save hook
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxLength: 200
    },

    description: {
      type: String,
      required: true,
      trim: true
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },

    ticketStatus: {
      type: String,
      enum: ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'],
      default: 'open'
    },

    department: {
      type: String,
      enum: ['technical', 'billing', 'general', 'sales'],
      default: 'general'
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    tags: [String],

    attachments: [
      {
        filename: String,
        originalName: String,
        url: String,
        mimeType: String,
        size: Number,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    messages: [
      {
        content: {
          type: String,
          required: true,
          trim: true
        },
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        isInternal: {
          type: Boolean,
          default: false
        },
        attachments: [
          {
            filename: String,
            originalName: String,
            url: String,
            mimeType: String,
            size: Number
          }
        ],
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    resolution: {
      summary: String,
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      resolvedAt: Date,
      resolutionTime: Number
    },

    sla: {
      responseTime: Number,
      resolutionTime: Number,
      firstResponseAt: Date,
      lastResponseAt: Date
    },

    relatedTickets: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket'
      }
    ],

    customerSatisfaction: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      feedback: String,
      submittedAt: Date
    },

    ...baseSchemaFields
  },
  {
    timestamps: true,
    versionKey: false
  }
);

ticketSchema.index({ ticketNumber: 1 }, { unique: true });
ticketSchema.index({ customer: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ ticketStatus: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ department: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ subject: 'text', description: 'text' });

Object.assign(ticketSchema.methods, baseSchemaMethods);
Object.assign(ticketSchema.statics, baseSchemaStatics);

// Add message to ticket
ticketSchema.methods.addMessage = function(messageData) {
  this.messages.push({
    ...messageData,
    createdAt: new Date()
  });
  
  // Update SLA timestamps
  if (!this.sla.firstResponseAt && !messageData.isInternal) {
    this.sla.firstResponseAt = new Date();
  }
  this.sla.lastResponseAt = new Date();
  
  return this;
};

// Close ticket with resolution
ticketSchema.methods.close = async function(resolutionData) {
  this.ticketStatus = 'closed';
  this.resolution = {
    summary: resolutionData.summary,
    resolvedBy: resolutionData.resolvedBy,
    resolvedAt: new Date()
  };
  
  // Calculate resolution time if ticket was created
  if (this.createdAt) {
    const resolutionTime = Math.floor((new Date() - this.createdAt) / (1000 * 60)); // in minutes
    this.resolution.resolutionTime = resolutionTime;
  }
  
  return this.save();
};

// Generate unique ticket number
ticketSchema.pre('save', async function (next) {
  if (this.isNew && !this.ticketNumber) {
    const count = await this.constructor.countDocuments();
    this.ticketNumber = `TK-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export const Ticket = mongoose.model('Ticket', ticketSchema);
