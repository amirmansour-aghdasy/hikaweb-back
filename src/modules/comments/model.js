import mongoose from 'mongoose';
import {
  baseSchemaFields,
  baseSchemaMethods,
  baseSchemaStatics
} from '../../shared/models/baseModel.js';

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, 'محتوای نظر الزامی است'],
      trim: true,
      maxLength: [1000, 'نظر نمی‌تواند بیش از ۱۰۰۰ کاراکتر باشد']
    },

    rating: {
      type: Number,
      required: true,
      min: [1, 'امتیاز باید حداقل ۱ باشد'],
      max: [5, 'امتیاز نمی‌تواند بیش از ۵ باشد']
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Polymorphic reference
    resourceType: {
      type: String,
      required: true,
      enum: ['Service', 'Portfolio', 'Article', 'Video', 'Product']
    },

    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'resourceType'
    },

    // Nested comments
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null
    },

    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
      }
    ],

    moderationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'spam'],
      default: 'pending'
    },

    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    moderatedAt: {
      type: Date,
      default: null
    },

    moderationReason: {
      type: String,
      trim: true
    },

    isVerifiedPurchase: {
      type: Boolean,
      default: false
    },

    helpfulVotes: {
      type: Number,
      default: 0
    },

    reportCount: {
      type: Number,
      default: 0
    },

    authorSnapshot: {
      name: String,
      avatar: String
    },

    ...baseSchemaFields
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes
commentSchema.index({ resourceType: 1, resourceId: 1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ moderationStatus: 1 });
commentSchema.index({ rating: -1 });
commentSchema.index({ createdAt: -1 });

Object.assign(commentSchema.methods, baseSchemaMethods);
Object.assign(commentSchema.statics, baseSchemaStatics);

// Moderate comment
commentSchema.methods.moderate = function (status, moderatorId, reason = null) {
  this.moderationStatus = status;
  this.moderatedBy = moderatorId;
  this.moderatedAt = new Date();
  if (reason) this.moderationReason = reason;
  return this.save();
};

// Pre-save: Store author snapshot
commentSchema.pre('save', async function (next) {
  if (this.isNew && this.author) {
    const User = mongoose.model('User');
    const author = await User.findById(this.author);
    if (author) {
      this.authorSnapshot = {
        name: author.name,
        avatar: author.avatar
      };
    }
  }
  next();
});

export const Comment = mongoose.model('Comment', commentSchema);
