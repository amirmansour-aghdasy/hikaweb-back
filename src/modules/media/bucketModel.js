import mongoose from 'mongoose';
import {
  baseSchemaFields,
  baseSchemaMethods,
  baseSchemaStatics
} from '../../shared/models/baseModel.js';

const bucketSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'نام bucket الزامی است'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, 'نام bucket فقط می‌تواند شامل حروف کوچک، اعداد و خط تیره باشد']
    },

    displayName: {
      type: String,
      required: [true, 'نام نمایشی bucket الزامی است'],
      trim: true
    },

    description: {
      type: String,
      trim: true
    },

    region: {
      type: String,
      required: true,
      default: 'ir-thr-at1',
      enum: ['ir-thr-at1', 'ir-tbz-sh1']
    },

    isPublic: {
      type: Boolean,
      default: false
    },

    versioningEnabled: {
      type: Boolean,
      default: false
    },

    // Storage statistics
    totalFiles: {
      type: Number,
      default: 0
    },

    totalSize: {
      type: Number,
      default: 0 // in bytes
    },

    // Folder structure (virtual folders stored as metadata)
    rootFolder: {
      type: String,
      default: '/'
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Metadata
    metadata: {
      type: Map,
      of: String
    },

    ...baseSchemaFields
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Note: name index is already created by unique: true in schema definition
bucketSchema.index({ createdBy: 1 });
bucketSchema.index({ region: 1 });
bucketSchema.index({ createdAt: -1 });

Object.assign(bucketSchema.methods, baseSchemaMethods);
Object.assign(bucketSchema.statics, baseSchemaStatics);

// Update statistics
bucketSchema.methods.updateStatistics = async function () {
  const Media = mongoose.model('Media');
  const stats = await Media.aggregate([
    {
      $match: {
        bucket: this._id,
        deletedAt: null
      }
    },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$size' }
      }
    }
  ]);

  if (stats.length > 0) {
    this.totalFiles = stats[0].totalFiles;
    this.totalSize = stats[0].totalSize;
  } else {
    this.totalFiles = 0;
    this.totalSize = 0;
  }

  await this.save();
};

export const Bucket = mongoose.model('Bucket', bucketSchema);

