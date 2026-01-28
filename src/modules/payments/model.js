import mongoose from 'mongoose';
import { baseSchemaFields, baseSchemaMethods, baseSchemaStatics } from '../../shared/models/baseModel.js';

// Payment Schema
const paymentSchema = new mongoose.Schema({
  // Payment Number (unique, human-readable)
  // Note: index is defined below using schema.index() with unique and sparse
  // Note: required is false because it's generated in pre-save hook
  paymentNumber: {
    type: String,
    required: false // Generated in pre-save hook
  },

  // Order reference
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },

  // User (payer)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Payment Amount
  amount: {
    type: Number,
    required: true,
    min: 0
  },

  // Payment Method
  method: {
    type: String,
    required: true,
    enum: ['online', 'cash', 'points'],
    default: 'online'
  },

  // Payment Gateway
  gateway: {
    type: String,
    enum: ['zarinpal', 'idpay', 'saman', 'manual'],
    default: 'zarinpal'
  },

  // Payment Status
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending',
    index: true
  },

  // Gateway Transaction Information
  transaction: {
    // Gateway transaction ID
    transactionId: String,
    // Gateway authority/token (for redirect)
    authority: String,
    // Gateway reference number
    refId: String,
    // Gateway response code
    responseCode: String,
    // Full gateway response
    gatewayResponse: mongoose.Schema.Types.Mixed,
    // Gateway callback data
    callbackData: mongoose.Schema.Types.Mixed
  },

  // Payment URLs
  urls: {
    // Redirect URL to gateway
    redirectUrl: String,
    // Callback URL from gateway
    callbackUrl: String
  },

  // Payment Timestamps
  timestamps: {
    initiatedAt: { type: Date, default: Date.now },
    processedAt: Date,
    completedAt: Date,
    failedAt: Date,
    cancelledAt: Date
  },

  // Error Information
  error: {
    code: String,
    message: String,
    details: mongoose.Schema.Types.Mixed
  },

  // Refund Information
  refund: {
    amount: Number,
    reason: String,
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    refundedAt: Date,
    refundTransactionId: String,
    refundGatewayResponse: mongoose.Schema.Types.Mixed
  },

  // Additional Metadata
  metadata: {
    description: String,
    customerInfo: {
      name: String,
      email: String,
      phone: String
    },
    ipAddress: String,
    userAgent: String
  },

  // Base schema fields (deletedAt, createdBy, updatedBy) - status is defined above
  deletedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for performance
paymentSchema.index({ order: 1, createdAt: -1 });
paymentSchema.index({ user: 1, createdAt: -1 });
// Note: paymentNumber index with unique and sparse (allows null values for uniqueness check)
paymentSchema.index({ paymentNumber: 1 }, { unique: true, sparse: true });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ 'transaction.transactionId': 1 });
paymentSchema.index({ 'transaction.authority': 1 });

// Methods
Object.assign(paymentSchema.methods, baseSchemaMethods);

// Generate unique payment number
paymentSchema.methods.generatePaymentNumber = function() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PAY-${timestamp}-${random}`;
};

// Update payment status
paymentSchema.methods.updateStatus = function(newStatus, data = {}) {
  const oldStatus = this.status;
  
  if (oldStatus === newStatus) {
    return; // No change needed
  }
  
  // Validate status transition
  const validTransitions = {
    'pending': ['processing', 'cancelled', 'failed'],
    'processing': ['completed', 'failed', 'cancelled'],
    'completed': ['refunded'],
    'failed': ['pending', 'cancelled'],
    'cancelled': [],
    'refunded': []
  };
  
  if (!validTransitions[oldStatus]?.includes(newStatus)) {
    throw new Error(`Cannot transition from ${oldStatus} to ${newStatus}`);
  }
  
  this.status = newStatus;
  
  // Set timestamps
  const now = new Date();
  switch (newStatus) {
    case 'processing':
      this.timestamps.processedAt = now;
      break;
    case 'completed':
      this.timestamps.completedAt = now;
      break;
    case 'failed':
      this.timestamps.failedAt = now;
      if (data.error) {
        this.error = data.error;
      }
      break;
    case 'cancelled':
      this.timestamps.cancelledAt = now;
      break;
  }
  
  // Update transaction data if provided
  if (data.transaction) {
    this.transaction = { ...this.transaction, ...data.transaction };
  }
  
  return this.save();
};

// Mark as completed
paymentSchema.methods.markAsCompleted = function(transactionData = {}) {
  return this.updateStatus('completed', {
    transaction: {
      ...this.transaction,
      ...transactionData
    }
  });
};

// Mark as failed
paymentSchema.methods.markAsFailed = function(errorData = {}) {
  return this.updateStatus('failed', {
    error: {
      code: errorData.code || 'PAYMENT_FAILED',
      message: errorData.message || 'Payment failed',
      details: errorData.details
    }
  });
};

// Cancel payment
paymentSchema.methods.cancel = function() {
  return this.updateStatus('cancelled');
};

// Refund payment
paymentSchema.methods.processRefund = function(refundData) {
  if (this.status !== 'completed') {
    throw new Error('Only completed payments can be refunded');
  }
  
  this.status = 'refunded';
  this.refund = {
    amount: refundData.amount || this.amount,
    reason: refundData.reason,
    refundedBy: refundData.refundedBy,
    refundedAt: new Date(),
    refundTransactionId: refundData.transactionId,
    refundGatewayResponse: refundData.gatewayResponse
  };
  
  return this.save();
};

// Statics
Object.assign(paymentSchema.statics, baseSchemaStatics);

// Find payment by order
paymentSchema.statics.findByOrder = function(orderId) {
  return this.findOne({ order: orderId, deletedAt: null })
    .populate('order')
    .populate('user', 'name email phoneNumber')
    .sort({ createdAt: -1 });
};

// Find payments by user
paymentSchema.statics.findByUser = function(userId, options = {}) {
  const query = this.find({ user: userId, deletedAt: null });
  
  if (options.status) {
    query.where('status').equals(options.status);
  }
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  if (options.skip) {
    query.skip(options.skip);
  }
  
  query.sort({ createdAt: -1 });
  
  return query;
};

// Find payment by transaction ID
paymentSchema.statics.findByTransactionId = function(transactionId) {
  return this.findOne({
    'transaction.transactionId': transactionId,
    deletedAt: null
  });
};

// Find payment by authority
paymentSchema.statics.findByAuthority = function(authority) {
  return this.findOne({
    'transaction.authority': authority,
    deletedAt: null
  });
};

// Pre-save hook: Generate payment number if not set
paymentSchema.pre('save', async function(next) {
  if (!this.paymentNumber) {
    let paymentNumber;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      paymentNumber = this.generatePaymentNumber();
      const existing = await this.constructor.findOne({ paymentNumber });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }
    
    if (!isUnique) {
      return next(new Error('Failed to generate unique payment number'));
    }
    
    this.paymentNumber = paymentNumber;
  }
  
  next();
});

export const Payment = mongoose.model('Payment', paymentSchema);

