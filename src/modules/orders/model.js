import mongoose from 'mongoose';
import { baseSchemaFields, baseSchemaMethods, baseSchemaStatics } from '../../shared/models/baseModel.js';

// Order Item Schema (embedded in Order)
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }, // Price at time of order
  salePrice: {
    type: Number,
    min: 0
  }, // Sale price if applicable
  total: {
    type: Number,
    required: true,
    min: 0
  }, // quantity * price
  // For digital products
  digitalProductData: {
    downloadUrl: String,
    downloadLimit: Number,
    downloadExpiry: Date,
    downloadCount: { type: Number, default: 0 }
  }
}, { _id: true });

// Order Status History Schema
const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  changedAt: {
    type: Date,
    default: Date.now
  },
  note: String // Optional note about status change
}, { _id: true });

// Main Order Schema
const orderSchema = new mongoose.Schema({
  // Order Number (unique, human-readable)
  // Note: index is defined below using schema.index()
  // Note: required is false because it's generated in pre-save hook
  orderNumber: {
    type: String,
    required: false, // Generated in pre-save hook
    unique: true,
    sparse: true // Allow null values for uniqueness check
  },

  // User (buyer)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Order Items
  items: [orderItemSchema],

  // Contact Information
  contactInfo: {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    }
  },

  // Shipping Information (for physical products)
  shipping: {
    address: {
      fullName: String,
      phoneNumber: String,
      address: String,
      city: String,
      province: String,
      postalCode: String,
      country: { type: String, default: 'Iran' }
    },
    method: {
      type: String,
      enum: ['standard', 'express', 'pickup'],
      default: 'standard'
    },
    cost: { type: Number, default: 0, min: 0 },
    trackingNumber: String,
    shippedAt: Date,
    deliveredAt: Date
  },

  // Payment Information
  payment: {
    method: {
      type: String,
      required: true,
      enum: ['online', 'points'] // cash removed
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String, // Payment gateway transaction ID
    paidAt: Date,
    amount: { type: Number, required: true, min: 0 },
    gateway: String, // Payment gateway name (zarinpal, idpay, etc.)
    gatewayResponse: mongoose.Schema.Types.Mixed // Full gateway response
  },

  // Order Totals
  totals: {
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 }
  },

  // Coupon/Discount
  coupon: {
    code: String,
    discount: Number,
    discountType: { type: String, enum: ['percentage', 'fixed'] }
  },

  // Order Status (must be defined AFTER baseSchemaFields to override base status field)
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending',
    index: true
  },

  // Status History
  statusHistory: [statusHistorySchema],

  // Notes
  notes: {
    customer: String, // Customer notes
    admin: String // Admin/internal notes
  },

  // Cancellation
  cancellation: {
    reason: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: Date
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
    refundMethod: String // 'original', 'wallet', etc.
  },

  // Related Cart (if order was created from cart)
  cart: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cart'
  },

  // Base schema fields (deletedAt, createdBy, updatedBy) - status is overridden above
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
orderSchema.index({ user: 1, createdAt: -1 });
// Note: orderNumber index is already created by unique: true in schema definition
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ createdAt: -1 });

// Methods
Object.assign(orderSchema.methods, baseSchemaMethods);

// Generate unique order number
orderSchema.methods.generateOrderNumber = function() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

// Calculate order totals
orderSchema.methods.calculateTotals = function() {
  let subtotal = 0;
  
  // Calculate subtotal from items
  this.items.forEach(item => {
    subtotal += item.total;
  });
  
  // Calculate discount
  let discount = 0;
  if (this.coupon && this.coupon.code) {
    if (this.coupon.discountType === 'percentage') {
      discount = (subtotal * this.coupon.discount) / 100;
    } else {
      discount = this.coupon.discount;
    }
  }
  
  // Calculate tax (configurable via environment variable, default: 9% VAT)
  const taxRate = parseFloat(process.env.TAX_RATE || '0.09');
  const tax = (subtotal - discount) * taxRate;
  
  // Shipping cost
  const shipping = this.shipping.cost || 0;
  
  // Final total
  const total = subtotal - discount + tax + shipping;
  
  this.totals = {
    subtotal,
    tax,
    shipping,
    discount,
    total
  };
  
  return this.totals;
};

// Update order status
orderSchema.methods.updateStatus = function(newStatus, userId = null, note = null) {
  const oldStatus = this.status;
  
  if (oldStatus === newStatus) {
    return; // No change needed
  }
  
  // Validate status transition
  const validTransitions = {
    'pending': ['processing', 'cancelled'],
    'processing': ['shipped', 'cancelled'],
    'shipped': ['delivered', 'cancelled'],
    'delivered': ['refunded'],
    'cancelled': [],
    'refunded': []
  };
  
  if (!validTransitions[oldStatus]?.includes(newStatus)) {
    throw new Error(`Cannot transition from ${oldStatus} to ${newStatus}`);
  }
  
  this.status = newStatus;
  
  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    changedBy: userId,
    changedAt: new Date(),
    note
  });
  
  // Set timestamps for specific statuses
  if (newStatus === 'shipped' && !this.shipping.shippedAt) {
    this.shipping.shippedAt = new Date();
  }
  
  if (newStatus === 'delivered' && !this.shipping.deliveredAt) {
    this.shipping.deliveredAt = new Date();
  }
  
  if (newStatus === 'cancelled') {
    this.cancellation = {
      cancelledBy: userId,
      cancelledAt: new Date()
    };
  }
  
  return this.save();
};

// Cancel order
orderSchema.methods.cancel = function(userId, reason = null) {
  if (this.status === 'delivered' || this.status === 'refunded') {
    throw new Error('Cannot cancel delivered or refunded order');
  }
  
  return this.updateStatus('cancelled', userId, reason);
};

// Mark as paid
orderSchema.methods.markAsPaid = async function(transactionId = null, gateway = null, gatewayResponse = null) {
  this.payment.status = 'completed';
  this.payment.paidAt = new Date();
  this.payment.transactionId = transactionId;
  this.payment.gateway = gateway;
  this.payment.gatewayResponse = gatewayResponse;
  
  // Check if all items are digital products
  // If all items are digital, set status to 'delivered' immediately
  // Otherwise, set to 'processing' for physical products
  if (this.status === 'pending') {
    // Populate items.product if not already populated
    if (!this.items[0]?.product?.type) {
      await this.populate('items.product', 'type');
    }
    
    // Check if all items are digital
    const allDigital = this.items.every(item => {
      const productType = item.product?.type || item.product?.type;
      return productType === 'digital';
    });
    
    const newStatus = allDigital ? 'delivered' : 'processing';
    const note = allDigital ? 'پرداخت انجام شد - محصول دیجیتال تحویل داده شد' : 'پرداخت انجام شد';
    
    this.status = newStatus;
    
    // Add to status history
    this.statusHistory.push({
      status: newStatus,
      changedBy: null,
      changedAt: new Date(),
      note
    });
  }
  
  // Save only once
  return this.save();
};

// Statics
Object.assign(orderSchema.statics, baseSchemaStatics);

// Find orders by user
orderSchema.statics.findByUser = function(userId, options = {}) {
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

// Find orders by status
orderSchema.statics.findByStatus = function(status, options = {}) {
  const query = this.find({ status, deletedAt: null });
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  if (options.skip) {
    query.skip(options.skip);
  }
  
  query.sort({ createdAt: -1 });
  
  return query;
};

// Pre-save hook: Generate order number if not set
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    let orderNumber;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      orderNumber = this.generateOrderNumber();
      const existing = await this.constructor.findOne({ orderNumber });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }
    
    if (!isUnique) {
      return next(new Error('Failed to generate unique order number'));
    }
    
    this.orderNumber = orderNumber;
  }
  
  // Initialize status history if empty
  if (this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date()
    });
  }
  
  next();
});

export const Order = mongoose.model('Order', orderSchema);

