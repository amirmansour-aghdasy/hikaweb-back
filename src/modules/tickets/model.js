import mongoose from 'mongoose';
import {
  baseSchemaFields,
  baseSchemaMethods,
  baseSchemaStatics
} from '../../shared/models/BaseModel.js';

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      unique: true,
      required: true
    },

    subject: {
      type: String,
      required: [true, 'موضوع تیکت الزامی است'],
      trim: true,
      maxLength: [200, 'موضوع نمی‌تواند بیش از ۲۰۰ کاراکتر باشد']
    },

    description: {
      type: String,
      required: [true, 'شرح تیکت الزامی است'],
      trim: true
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    department: {
      type: String,
      required: true,
      enum: ['technical', 'sales', 'support', 'billing', 'general']
    },

    priority: {
      type: String,
      required: true,
      enum: ['low', 'normal', 'high', 'urgent', 'critical'],
      default: 'normal'
    },

    ticketStatus: {
      type: String,
      required: true,
      enum: ['open', 'in_progress', 'waiting_response', 'resolved', 'closed', 'cancelled'],
      default: 'open'
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
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
      resolutionTime: Number // in minutes
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

ticketSchema.index({ ticketNumber: 1 });
ticketSchema.index({ customer: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ ticketStatus: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ department: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ subject: 'text', description: 'text' });

Object.assign(ticketSchema.methods, baseSchemaMethods);
Object.assign(ticketSchema.statics, baseSchemaStatics);

// Generate unique ticket number
ticketSchema.pre('save', async function (next) {
  if (this.isNew && !this.ticketNumber) {
    const count = await this.constructor.countDocuments();
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    this.ticketNumber = `HW${year}${month}${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

// Add message to ticket
ticketSchema.methods.addMessage = function (messageData) {
  this.messages.push(messageData);

  // Update SLA tracking
  if (!this.sla.firstResponseAt && messageData.author.toString() !== this.customer.toString()) {
    this.sla.firstResponseAt = new Date();
    this.sla.responseTime = Math.floor((this.sla.firstResponseAt - this.createdAt) / (1000 * 60));
  }

  this.sla.lastResponseAt = new Date();
  return this.save();
};

// Close ticket
ticketSchema.methods.close = function (resolutionData) {
  this.ticketStatus = 'closed';
  this.resolution = {
    ...resolutionData,
    resolvedAt: new Date()
  };

  this.resolution.resolutionTime = Math.floor(
    (this.resolution.resolvedAt - this.createdAt) / (1000 * 60)
  );
  return this.save();
};

export const Ticket = mongoose.model('Ticket', ticketSchema);
