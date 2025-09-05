import mongoose from 'mongoose';

export const baseSchemaFields = {
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },
  
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
};

export const baseSchemaMethods = {
  /**
   * Soft delete the document
   */
  softDelete(userId) {
    this.deletedAt = new Date();
    this.updatedBy = userId;
    return this.save();
  },

  /**
   * Restore soft deleted document
   */
  restore(userId) {
    this.deletedAt = null;
    this.updatedBy = userId;
    return this.save();
  },

  /**
   * Check if document is deleted
   */
  isDeleted() {
    return this.deletedAt !== null;
  },

  /**
   * Get formatted creation date
   */
  getFormattedDate(field = 'createdAt', locale = 'fa-IR') {
    return this[field] ? this[field].toLocaleDateString(locale) : null;
  }
};

export const baseSchemaStatics = {
  /**
   * Find all active documents
   */
  findActive(filter = {}) {
    return this.find({ 
      ...filter, 
      deletedAt: null, 
      status: 'active' 
    });
  },

  /**
   * Find with deleted documents
   */
  findWithDeleted(filter = {}) {
    return this.find(filter);
  },

  /**
   * Find only deleted documents
   */
  findDeleted(filter = {}) {
    return this.find({ 
      ...filter, 
      deletedAt: { $ne: null } 
    });
  },

  /**
   * Count active documents
   */
  countActive(filter = {}) {
    return this.countDocuments({ 
      ...filter, 
      deletedAt: null, 
      status: 'active' 
    });
  }
};