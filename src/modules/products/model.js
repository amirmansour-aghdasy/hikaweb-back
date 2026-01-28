import mongoose from 'mongoose';
import { baseSchemaFields, baseSchemaMethods, baseSchemaStatics } from '../../shared/models/baseModel.js';

const productSchema = new mongoose.Schema({
  // Basic Information
  name: {
    fa: { type: String, required: true, trim: true, maxLength: 200 },
    en: { type: String, required: true, trim: true, maxLength: 200 }
  },
  slug: {
    fa: { type: String, required: true, lowercase: true, unique: true },
    en: { type: String, required: true, lowercase: true, unique: true }
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  
  // Product Type
  type: {
    type: String,
    required: true,
    enum: ['digital', 'physical'],
    default: 'physical'
  },
  
  // Digital Product Specific
  digitalProduct: {
    contentType: {
      type: String,
      enum: ['article', 'file', 'course', 'ebook', 'software', 'other'],
      default: 'file'
    },
    downloadUrl: String,
    downloadLimit: { type: Number, default: null }, // null = unlimited
    downloadExpiry: { type: Number, default: null }, // days, null = never expires
    fileSize: Number,
    fileType: String
  },
  
  // Physical Product Specific
  physicalProduct: {
    weight: Number, // in grams
    dimensions: {
      length: Number, // in cm
      width: Number,
      height: Number
    },
    shippingClass: {
      type: String,
      enum: ['standard', 'express', 'fragile', 'heavy'],
      default: 'standard'
    },
    requiresShipping: { type: Boolean, default: true }
  },
  
  // Description
  shortDescription: {
    fa: { type: String, maxLength: 500 },
    en: { type: String, maxLength: 500 }
  },
  description: {
    fa: { type: String, required: true },
    en: { type: String, required: true }
  },
  fullDescription: {
    fa: String,
    en: String
  },
  
  // Media
  featuredImage: { type: String, required: true },
  gallery: [{
    url: String,
    alt: { fa: String, en: String },
    caption: { fa: String, en: String },
    order: { type: Number, default: 0 }
  }],
  videoUrl: String,
  
  // Pricing
  pricing: {
    basePrice: { type: Number, required: true, min: 0 },
    compareAtPrice: Number, // Original price for showing discount
    currency: { type: String, default: 'IRR', enum: ['IRR', 'USD', 'EUR'] },
    isOnSale: { type: Boolean, default: false },
    salePrice: Number,
    saleStartDate: Date,
    saleEndDate: Date,
    // Price history for chart
    priceHistory: [{
      price: { type: Number, required: true },
      date: { type: Date, default: Date.now },
      reason: String // 'sale', 'update', 'discount', etc.
    }]
  },
  
  // Inventory (for physical products)
  inventory: {
    trackInventory: { type: Boolean, default: true },
    quantity: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    allowBackorder: { type: Boolean, default: false },
    stockStatus: {
      type: String,
      enum: ['in_stock', 'out_of_stock', 'low_stock', 'on_backorder'],
      default: 'in_stock'
    }
  },
  
  // Categories and Tags
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  tags: {
    fa: [String],
    en: [String]
  },
  
  // Product Specifications
  specifications: [{
    name: { fa: String, en: String },
    value: { fa: String, en: String },
    group: { fa: String, en: String } // Group related specs together
  }],
  
  // Suitable For
  suitableFor: {
    fa: [String], // Array of descriptions
    en: [String]
  },
  
  // SEO
  seo: {
    metaTitle: { fa: String, en: String },
    metaDescription: { fa: String, en: String },
    metaKeywords: { fa: [String], en: [String] },
    ogImage: String
  },
  
  // Ratings and Reviews
  ratings: {
    total: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
    average: { type: Number, default: 0, min: 0, max: 5 },
    breakdown: {
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 }
    }
  },
  
  // Engagement Metrics
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  bookmarks: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  sales: { type: Number, default: 0 },
  
  // Notification Settings
  notificationSubscribers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    channels: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      web: { type: Boolean, default: true }
    },
    subscribedAt: { type: Date, default: Date.now }
  }],
  
  // Related Content
  relatedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  relatedArticles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article'
  }],
  relatedServices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  relatedVideos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  }],
  
  // Loyalty Points (Hika Club)
  loyaltyPoints: {
    earnOnPurchase: { type: Number, default: 0 }, // Points earned when buying
    requiredForDiscount: { type: Number, default: null } // Points needed to get discount
  },
  
  // Publishing
  isPublished: { type: Boolean, default: false },
  publishedAt: Date,
  isFeatured: { type: Boolean, default: false },
  orderIndex: { type: Number, default: 0 },
  
  // Vendor/Supplier (if applicable)
  vendor: {
    name: String,
    contact: String
  },
  
  ...baseSchemaFields
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for performance
productSchema.index({ slug: { fa: 1 } });
productSchema.index({ slug: { en: 1 } });
// Note: sku index is already created by unique: true in schema definition
productSchema.index({ type: 1, status: 1, isPublished: 1 });
productSchema.index({ categories: 1 });
productSchema.index({ 'pricing.basePrice': 1 });
productSchema.index({ 'ratings.average': -1 });
productSchema.index({ sales: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ orderIndex: 1 });

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.pricing.compareAtPrice && this.pricing.basePrice) {
    return Math.round(((this.pricing.compareAtPrice - this.pricing.basePrice) / this.pricing.compareAtPrice) * 100);
  }
  return 0;
});

// Virtual for current price (considering sale)
productSchema.virtual('currentPrice').get(function() {
  const now = new Date();
  if (this.pricing.isOnSale && 
      this.pricing.salePrice &&
      (!this.pricing.saleStartDate || this.pricing.saleStartDate <= now) &&
      (!this.pricing.saleEndDate || this.pricing.saleEndDate >= now)) {
    return this.pricing.salePrice;
  }
  return this.pricing.basePrice;
});

// Methods
Object.assign(productSchema.methods, baseSchemaMethods);

// Update stock status based on quantity
productSchema.methods.updateStockStatus = function() {
  if (!this.inventory.trackInventory) {
    this.inventory.stockStatus = 'in_stock';
    return;
  }
  
  if (this.inventory.quantity <= 0) {
    this.inventory.stockStatus = this.inventory.allowBackorder ? 'on_backorder' : 'out_of_stock';
  } else if (this.inventory.quantity <= this.inventory.lowStockThreshold) {
    this.inventory.stockStatus = 'low_stock';
  } else {
    this.inventory.stockStatus = 'in_stock';
  }
};

// Add price to history
productSchema.methods.addPriceToHistory = function(price, reason = 'update') {
  this.pricing.priceHistory.push({
    price,
    date: new Date(),
    reason
  });
  
  // Keep only last 100 price changes
  if (this.pricing.priceHistory.length > 100) {
    this.pricing.priceHistory = this.pricing.priceHistory.slice(-100);
  }
};

// Update rating
productSchema.methods.updateRating = function(newRating) {
  this.ratings.count += 1;
  this.ratings.total += newRating;
  this.ratings.average = this.ratings.total / this.ratings.count;
  
  // Update breakdown
  if (newRating >= 1 && newRating <= 5) {
    this.ratings.breakdown[newRating] = (this.ratings.breakdown[newRating] || 0) + 1;
  }
};

// Statics
Object.assign(productSchema.statics, baseSchemaStatics);

// Find products by category
productSchema.statics.findByCategory = function(categoryId, options = {}) {
  return this.find({
    categories: categoryId,
    deletedAt: null,
    status: 'active',
    isPublished: true,
    ...options
  });
};

// Find products on sale
productSchema.statics.findOnSale = function() {
  const now = new Date();
  return this.find({
    'pricing.isOnSale': true,
    'pricing.saleStartDate': { $lte: now },
    'pricing.saleEndDate': { $gte: now },
    deletedAt: null,
    status: 'active',
    isPublished: true
  });
};

export const Product = mongoose.model('Product', productSchema);

