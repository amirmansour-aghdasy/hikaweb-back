import mongoose from 'mongoose';
import { baseSchemaFields, baseSchemaMethods, baseSchemaStatics } from '../../shared/models/baseModel.js';

// Coupon Usage Tracking Schema
const couponUsageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  usedAt: {
    type: Date,
    default: Date.now
  },
  discountAmount: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: true });

// Main Coupon Schema
const couponSchema = new mongoose.Schema({
  // Coupon Code (unique, uppercase)
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    // Note: index is defined below using schema.index()
    minLength: 3,
    maxLength: 50
  },

  // Coupon Type
  type: {
    type: String,
    required: true,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },

  // Discount Value
  value: {
    type: Number,
    required: true,
    min: 0
  }, // Percentage (0-100) or Fixed amount

  // Discount Limits
  limits: {
    // Minimum order amount to apply coupon
    minOrderAmount: { type: Number, min: 0, default: 0 },
    // Maximum discount amount (for percentage coupons)
    maxDiscountAmount: { type: Number, min: 0, default: null },
    // Maximum usage count (null = unlimited)
    maxUsage: { type: Number, min: 0, default: null },
    // Usage count per user (null = unlimited)
    maxUsagePerUser: { type: Number, min: 0, default: null }
  },

  // Validity Period
  validFrom: {
    type: Date,
    required: true,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: true,
    index: true
  },

  // Applicable Products/Categories
  applicableTo: {
    // Specific products
    products: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    // Specific categories
    categories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }],
    // All products (if empty)
    allProducts: { type: Boolean, default: true }
  },

  // Excluded Products/Categories
  excludedFrom: {
    products: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    categories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }]
  },

  // User Restrictions
  restrictions: {
    // Specific users only
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    // New users only
    newUsersOnly: { type: Boolean, default: false },
    // Minimum user level/points
    minUserLevel: { type: Number, min: 0, default: 0 }
  },

  // Usage Tracking
  usage: {
    count: { type: Number, default: 0, min: 0 },
    totalDiscount: { type: Number, default: 0, min: 0 },
    history: [couponUsageSchema]
  },

  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // Description
  description: {
    fa: String,
    en: String
  },

  ...baseSchemaFields
}, {
  timestamps: true,
  versionKey: false
});

// Indexes
// Note: code index is already created by unique: true in schema definition
couponSchema.index({ isActive: 1, validUntil: 1 });
couponSchema.index({ 'validFrom': 1, 'validUntil': 1 });

// Methods
Object.assign(couponSchema.methods, baseSchemaMethods);

// Check if coupon is valid
couponSchema.methods.isValid = function() {
  const now = new Date();
  
  // Check if active
  if (!this.isActive || this.deletedAt) {
    return { valid: false, reason: 'کد تخفیف غیرفعال است' };
  }
  
  // Check validity period
  if (now < this.validFrom) {
    return { valid: false, reason: 'کد تخفیف هنوز فعال نشده است' };
  }
  
  if (now > this.validUntil) {
    return { valid: false, reason: 'کد تخفیف منقضی شده است' };
  }
  
  // Check usage limit
  if (this.limits.maxUsage && this.usage.count >= this.limits.maxUsage) {
    return { valid: false, reason: 'کد تخفیف به حداکثر استفاده رسیده است' };
  }
  
  return { valid: true };
};

// Check if coupon can be used by user
couponSchema.methods.canBeUsedByUser = function(userId, orderAmount = 0) {
  const validity = this.isValid();
  if (!validity.valid) {
    return validity;
  }
  
  // Check minimum order amount
  if (orderAmount < this.limits.minOrderAmount) {
    return {
      valid: false,
      reason: `حداقل مبلغ سفارش برای استفاده از این کد ${this.limits.minOrderAmount.toLocaleString('fa-IR')} تومان است`
    };
  }
  
  // Check user restrictions
  if (this.restrictions.users.length > 0) {
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    if (!this.restrictions.users.some(id => id.toString() === userObjectId.toString())) {
      return { valid: false, reason: 'این کد تخفیف برای شما معتبر نیست' };
    }
  }
  
  // Check usage per user
  if (this.limits.maxUsagePerUser) {
    const userUsageCount = this.usage.history.filter(
      usage => usage.user.toString() === userId.toString()
    ).length;
    
    if (userUsageCount >= this.limits.maxUsagePerUser) {
      return { valid: false, reason: 'شما از این کد تخفیف به حداکثر استفاده رسیده‌اید' };
    }
  }
  
  return { valid: true };
};

// Calculate discount amount
couponSchema.methods.calculateDiscount = function(orderAmount) {
  let discount = 0;
  
  if (this.type === 'percentage') {
    discount = (orderAmount * this.value) / 100;
    
    // Apply max discount limit if set
    if (this.limits.maxDiscountAmount && discount > this.limits.maxDiscountAmount) {
      discount = this.limits.maxDiscountAmount;
    }
  } else {
    // Fixed amount
    discount = this.value;
    
    // Don't exceed order amount
    if (discount > orderAmount) {
      discount = orderAmount;
    }
  }
  
  return Math.round(discount);
};

// Check if coupon applies to product
couponSchema.methods.appliesToProduct = function(productId, categoryIds = []) {
  // Check if all products are allowed
  if (this.applicableTo.allProducts) {
    // Check exclusions
    const isExcluded = this.excludedFrom.products.some(
      id => id.toString() === productId.toString()
    ) || this.excludedFrom.categories.some(
      catId => categoryIds.some(cid => cid.toString() === catId.toString())
    );
    
    return !isExcluded;
  }
  
  // Check if product is in included list
  const isIncluded = this.applicableTo.products.some(
    id => id.toString() === productId.toString()
  ) || this.applicableTo.categories.some(
    catId => categoryIds.some(cid => cid.toString() === catId.toString())
  );
  
  return isIncluded;
};

// Record usage
couponSchema.methods.recordUsage = function(userId, orderId, discountAmount) {
  this.usage.count += 1;
  this.usage.totalDiscount += discountAmount;
  this.usage.history.push({
    user: userId,
    order: orderId,
    usedAt: new Date(),
    discountAmount: discountAmount
  });
  
  return this.save();
};

// Statics
Object.assign(couponSchema.statics, baseSchemaStatics);

// Find active coupon by code
couponSchema.statics.findActiveByCode = function(code) {
  const now = new Date();
  return this.findOne({
    code: code.toUpperCase().trim(),
    isActive: true,
    deletedAt: null,
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  });
};

// Find valid coupons
couponSchema.statics.findValid = function() {
  const now = new Date();
  return this.find({
    isActive: true,
    deletedAt: null,
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  });
};

export const Coupon = mongoose.model('Coupon', couponSchema);

