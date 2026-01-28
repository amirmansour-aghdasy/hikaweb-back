import mongoose from 'mongoose';
import { baseSchemaFields, baseSchemaMethods, baseSchemaStatics } from '../../shared/models/baseModel.js';

// Cart Item Schema (embedded in Cart)
const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }, // Price at time of adding to cart
  total: {
    type: Number,
    required: true,
    min: 0
  }, // quantity * price
  addedAt: {
    type: Date,
    default: Date.now
  },
  // For digital products
  digitalProductData: {
    downloadUrl: String,
    downloadLimit: Number,
    downloadExpiry: Date
  }
}, { _id: true });

// Main Cart Schema
const cartSchema = new mongoose.Schema({
  // User identification
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Can be null for guest users
    index: true,
    sparse: true
  },
  
  // Guest cart identification (for non-logged users)
  guestId: {
    type: String,
    required: false,
    index: true,
    sparse: true,
    unique: true
  },
  
  // Cart items
  items: [cartItemSchema],
  
  // Cart metadata
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      // Default: 7 days from now
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);
      return expiry;
    },
    index: true // Index for finding expired carts
  },
  
  // Notification tracking
  notifications: {
    sent2DaysBefore: { type: Boolean, default: false },
    sent1DayBefore: { type: Boolean, default: false },
    sentOnExpiry: { type: Boolean, default: false },
    lastNotificationSent: Date
  },
  
  // Cart totals (cached for performance)
  totals: {
    subtotal: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 }
  },
  
  // Coupon/Discount code
  coupon: {
    code: String,
    discount: Number,
    discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' }
  },
  
  // Shipping information (for physical products)
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
    cost: { type: Number, default: 0 }
  },
  
  // Cart status
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active',
    index: true
  },
  
  // Last activity
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Abandoned cart tracking
  abandonedAt: Date,
  convertedAt: Date,
  
  ...baseSchemaFields
}, {
  timestamps: true,
  versionKey: false
});

// Indexes
cartSchema.index({ user: 1, status: 1 });
cartSchema.index({ guestId: 1, status: 1 });
cartSchema.index({ expiresAt: 1, status: 1 });
cartSchema.index({ lastActivity: -1 });
cartSchema.index({ 'items.product': 1 });

// Methods
Object.assign(cartSchema.methods, baseSchemaMethods);

// Calculate cart totals
cartSchema.methods.calculateTotals = function() {
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
  
  // Shipping cost (already set)
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

// Add item to cart
cartSchema.methods.addItem = function(productId, quantity = 1, price) {
  // Check if item already exists
  const existingItemIndex = this.items.findIndex(
    item => item.product.toString() === productId.toString()
  );
  
  if (existingItemIndex !== -1) {
    // Update quantity
    this.items[existingItemIndex].quantity += quantity;
    this.items[existingItemIndex].total = 
      this.items[existingItemIndex].quantity * this.items[existingItemIndex].price;
  } else {
    // Add new item
    this.items.push({
      product: productId,
      quantity,
      price: price || 0,
      total: quantity * (price || 0),
      addedAt: new Date()
    });
  }
  
  this.lastActivity = new Date();
  this.calculateTotals();
};

// Update item quantity
cartSchema.methods.updateItemQuantity = function(productId, quantity) {
  const item = this.items.find(
    item => item.product.toString() === productId.toString()
  );
  
  if (item) {
    if (quantity <= 0) {
      // Remove item
      this.items = this.items.filter(
        item => item.product.toString() !== productId.toString()
      );
    } else {
      item.quantity = quantity;
      item.total = quantity * item.price;
    }
    
    this.lastActivity = new Date();
    this.calculateTotals();
  }
};

// Remove item from cart
cartSchema.methods.removeItem = function(productId) {
  this.items = this.items.filter(
    item => item.product.toString() !== productId.toString()
  );
  
  this.lastActivity = new Date();
  this.calculateTotals();
};

// Clear cart
cartSchema.methods.clear = function() {
  this.items = [];
  this.totals = {
    subtotal: 0,
    tax: 0,
    shipping: 0,
    discount: 0,
    total: 0
  };
  this.coupon = {};
  this.lastActivity = new Date();
};

// Check if cart is expired
cartSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Mark as abandoned (now uses 'inactive' status)
cartSchema.methods.markAsAbandoned = function() {
  this.status = 'inactive';
  this.abandonedAt = new Date();
};

// Mark as converted (purchased) - now uses 'archived' status
cartSchema.methods.markAsConverted = function() {
  this.status = 'archived';
  this.convertedAt = new Date();
};

// Get time until expiry
cartSchema.methods.getTimeUntilExpiry = function() {
  if (!this.expiresAt) {
    return null;
  }
  
  const now = new Date();
  const expiry = new Date(this.expiresAt);
  const diff = expiry - now;
  
  if (diff <= 0) {
    return null;
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes, total: diff };
};

// Extend expiry (when user interacts with cart)
cartSchema.methods.extendExpiry = function(days = 7) {
  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + days);
  this.expiresAt = newExpiry;
  this.lastActivity = new Date();
  
  // Reset notification flags if cart was archived
  if (this.status === 'archived') {
    this.status = 'active';
  }
};

// Statics
Object.assign(cartSchema.statics, baseSchemaStatics);

// Find or create cart for user
cartSchema.statics.findOrCreateForUser = async function(userId) {
  let cart = await this.findOne({
    user: userId,
    status: 'active',
    expiresAt: { $gt: new Date() }
  }).populate('items.product');
  
  if (!cart) {
    cart = new this({
      user: userId,
      items: [],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    await cart.save();
  }
  
  return cart;
};

// Find or create cart for guest
cartSchema.statics.findOrCreateForGuest = async function(guestId) {
  let cart = await this.findOne({
    guestId,
    status: 'active',
    expiresAt: { $gt: new Date() }
  }).populate('items.product');
  
  if (!cart) {
    cart = new this({
      guestId,
      items: [],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    await cart.save();
  }
  
  return cart;
};

// Merge guest cart with user cart
cartSchema.statics.mergeCarts = async function(guestCartId, userId) {
  const guestCart = await this.findOne({ guestId: guestCartId, status: 'active' });
  const userCart = await this.findOrCreateForUser(userId);
  
  if (guestCart && guestCart.items.length > 0) {
    // Merge items
    guestCart.items.forEach(guestItem => {
      userCart.addItem(
        guestItem.product,
        guestItem.quantity,
        guestItem.price
      );
    });
    
    await userCart.save();
    
    // Mark guest cart as archived (merged into user cart)
    guestCart.markAsConverted(); // This now sets status to 'archived'
    await guestCart.save();
  }
  
  return userCart;
};

// Find expired carts
cartSchema.statics.findExpired = function() {
  return this.find({
    status: 'active',
    expiresAt: { $lte: new Date() }
  });
};

// Find carts expiring soon (for notifications)
cartSchema.statics.findExpiringSoon = function(days = 2) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + days - 1);
  
  return this.find({
    status: 'active',
    expiresAt: {
      $gte: startDate,
      $lte: targetDate
    },
    'notifications.sent2DaysBefore': false // Only if not already notified
  }).populate('user');
};

export const Cart = mongoose.model('Cart', cartSchema);

