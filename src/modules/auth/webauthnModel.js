import mongoose from 'mongoose';

const webauthnCredentialSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    // Credential ID (unique identifier)
    credentialID: {
      type: String,
      required: true,
      unique: true
    },
    
    // Public Key (for verification)
    publicKey: {
      type: String,
      required: true
    },
    
    // Counter (for replay attack prevention)
    counter: {
      type: Number,
      default: 0
    },
    
    // Device information
    deviceName: {
      type: String,
      trim: true,
      maxLength: 100
    },
    
    // Device type (mobile, desktop, etc.)
    deviceType: {
      type: String,
      enum: ['mobile', 'desktop', 'tablet', 'unknown'],
      default: 'unknown'
    },
    
    // Authenticator type
    authenticatorType: {
      type: String,
      enum: ['fingerprint', 'face', 'hardware', 'platform', 'unknown'],
      default: 'unknown'
    },
    
    // Last used timestamp
    lastUsed: {
      type: Date,
      default: Date.now
    },
    
    // Is active
    isActive: {
      type: Boolean,
      default: true
    },
    
    // Registration timestamp
    registeredAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes for efficient queries
webauthnCredentialSchema.index({ user: 1, isActive: 1 });
// Note: credentialID already has an index from unique: true, so no need to define it again

// Methods
webauthnCredentialSchema.methods.updateCounter = function(newCounter) {
  if (newCounter <= this.counter) {
    throw new Error('Counter must be greater than previous counter');
  }
  this.counter = newCounter;
  this.lastUsed = new Date();
  return this.save();
};

webauthnCredentialSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

export const WebAuthnCredential = mongoose.model('WebAuthnCredential', webauthnCredentialSchema);

