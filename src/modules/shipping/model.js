import mongoose from 'mongoose';
import { baseSchemaFields, baseSchemaMethods, baseSchemaStatics } from '../../shared/models/baseModel.js';

// Shipping Address Schema
const shippingAddressSchema = new mongoose.Schema({
  // User (owner of address)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Address Type
  type: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home'
  },

  // Address Label (for user convenience)
  label: {
    type: String,
    trim: true,
    maxLength: 50,
    default: 'آدرس من'
  },

  // Contact Information
  contactInfo: {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxLength: 100
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true
    }
  },

  // Address Details
  address: {
    address: {
      type: String,
      required: true,
      trim: true,
      maxLength: 500
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxLength: 50
    },
    province: {
      type: String,
      required: true,
      trim: true,
      maxLength: 50
    },
    postalCode: {
      type: String,
      trim: true,
      maxLength: 10
    },
    country: {
      type: String,
      default: 'Iran',
      trim: true
    },
    // Optional: Coordinates for distance calculation
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },

  // Is Default Address
  isDefault: {
    type: Boolean,
    default: false,
    index: true
  },

  ...baseSchemaFields
}, {
  timestamps: true,
  versionKey: false
});

// Indexes
shippingAddressSchema.index({ user: 1, isDefault: 1 });
shippingAddressSchema.index({ user: 1, createdAt: -1 });

// Methods
Object.assign(shippingAddressSchema.methods, baseSchemaMethods);

// Set as default address (and unset others)
shippingAddressSchema.methods.setAsDefault = async function() {
  // Unset other default addresses for this user
  await this.constructor.updateMany(
    { user: this.user, _id: { $ne: this._id } },
    { isDefault: false }
  );
  
  this.isDefault = true;
  return this.save();
};

// Statics
Object.assign(shippingAddressSchema.statics, baseSchemaStatics);

// Find default address for user
shippingAddressSchema.statics.findDefaultForUser = function(userId) {
  return this.findOne({
    user: userId,
    isDefault: true,
    deletedAt: null
  });
};

// Find all addresses for user
shippingAddressSchema.statics.findByUser = function(userId) {
  return this.find({
    user: userId,
    deletedAt: null
  }).sort({ isDefault: -1, createdAt: -1 });
};

export const ShippingAddress = mongoose.model('ShippingAddress', shippingAddressSchema);

// Shipping Method Configuration Schema (for admin settings)
const shippingMethodSchema = new mongoose.Schema({
  // Method Name
  name: {
    type: String,
    required: true,
    enum: ['standard', 'express', 'pickup'],
    unique: true
  },

  // Display Name
  displayName: {
    fa: { type: String, required: true },
    en: { type: String, required: true }
  },

  // Description
  description: {
    fa: String,
    en: String
  },

  // Cost Calculation Type
  costCalculation: {
    type: {
      type: String,
      enum: ['fixed', 'weight', 'distance', 'price'],
      required: true,
      default: 'fixed'
    },
    // Fixed cost
    fixedCost: { type: Number, min: 0, default: 0 },
    // Weight-based (cost per kg)
    costPerKg: { type: Number, min: 0, default: 0 },
    // Distance-based (cost per km)
    costPerKm: { type: Number, min: 0, default: 0 },
    // Price-based (percentage of order total)
    percentage: { type: Number, min: 0, max: 100, default: 0 },
    // Minimum cost
    minCost: { type: Number, min: 0, default: 0 },
    // Maximum cost
    maxCost: { type: Number, min: 0, default: null }
  },

  // Estimated Delivery Time (in days)
  estimatedDays: {
    min: { type: Number, min: 1, default: 3 },
    max: { type: Number, min: 1, default: 5 }
  },

  // Is Available
  isAvailable: {
    type: Boolean,
    default: true
  },

  // Is Enabled
  isEnabled: {
    type: Boolean,
    default: true
  },

  ...baseSchemaFields
}, {
  timestamps: true,
  versionKey: false
});

// Indexes
// Note: name index is already created by unique: true in schema definition
shippingMethodSchema.index({ isEnabled: 1, isAvailable: 1 });

// Methods
Object.assign(shippingMethodSchema.methods, baseSchemaMethods);

// Calculate shipping cost
shippingMethodSchema.methods.calculateCost = function(calculationData) {
  const { weight = 0, distance = 0, orderTotal = 0 } = calculationData;
  let cost = 0;

  switch (this.costCalculation.type) {
    case 'fixed':
      cost = this.costCalculation.fixedCost || 0;
      break;

    case 'weight':
      cost = (weight / 1000) * (this.costCalculation.costPerKg || 0); // weight in grams, costPerKg
      break;

    case 'distance':
      cost = distance * (this.costCalculation.costPerKm || 0);
      break;

    case 'price':
      cost = (orderTotal * (this.costCalculation.percentage || 0)) / 100;
      break;

    default:
      cost = 0;
  }

  // Apply min/max constraints
  if (this.costCalculation.minCost && cost < this.costCalculation.minCost) {
    cost = this.costCalculation.minCost;
  }

  if (this.costCalculation.maxCost && cost > this.costCalculation.maxCost) {
    cost = this.costCalculation.maxCost;
  }

  return Math.round(cost);
};

// Statics
Object.assign(shippingMethodSchema.statics, baseSchemaStatics);

// Find enabled methods
shippingMethodSchema.statics.findEnabled = function() {
  return this.find({
    isEnabled: true,
    isAvailable: true,
    deletedAt: null
  });
};

// Find method by name
shippingMethodSchema.statics.findByName = function(name) {
  return this.findOne({
    name: name,
    isEnabled: true,
    deletedAt: null
  });
};

export const ShippingMethod = mongoose.model('ShippingMethod', shippingMethodSchema);

