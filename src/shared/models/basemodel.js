import mongoose from 'mongoose';

export const baseSchemaFields = {
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active',
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  deletedAt: {
    type: Date,
    default: null,
    index: true
  }
};

export const baseSchemaMethods = {
  softDelete() {
    this.deletedAt = new Date();
    this.status = 'archived';
    return this.save();
  },
  restore() {
    this.deletedAt = null;
    this.status = 'active';
    return this.save();
  }
};

export const baseSchemaStatics = {
  findActive(filter = {}) {
    return this.find({ ...filter, deletedAt: null });
  },
  
  async findPaginated(filter = {}, options = {}) {
    const { page = 1, limit = 10, sort = { createdAt: -1 }, search = '' } = options;
    
    let query = { ...filter, deletedAt: null };
    
    if (search) {
      const searchFields = options.searchFields || ['name', 'title'];
      query.$or = searchFields.map(field => ({
        [field]: new RegExp(search, 'i')
      }));
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.find(query).sort(sort).skip(skip).limit(limit),
      this.countDocuments(query)
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
};