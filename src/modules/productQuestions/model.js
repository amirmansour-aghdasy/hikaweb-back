import mongoose from 'mongoose';
import { baseSchemaFields, baseSchemaMethods, baseSchemaStatics } from '../../shared/models/baseModel.js';

/**
 * ProductQuestion Model
 * 
 * Q&A system for products
 * Features:
 * - Questions and answers
 * - Moderation
 * - Helpful votes
 * - Verified purchase indicator
 */
const productQuestionSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  
  question: {
    type: String,
    required: true,
    trim: true,
    maxLength: 500
  },
  
  askedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Answers
  answers: [{
    answer: {
      type: String,
      required: true,
      trim: true,
      maxLength: 1000
    },
    answeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isVendorAnswer: {
      type: Boolean,
      default: false
    },
    helpfulVotes: {
      type: Number,
      default: 0
    },
    helpfulVoters: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    moderationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    moderatedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Moderation
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'spam'],
    default: 'pending'
  },
  
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  moderatedAt: Date,
  
  moderationReason: String,
  
  // Engagement
  helpfulVotes: {
    type: Number,
    default: 0
  },
  
  helpfulVoters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  reportCount: {
    type: Number,
    default: 0
  },
  
  // Metadata
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  },
  
  authorSnapshot: {
    name: String,
    avatar: String
  },
  
  ...baseSchemaFields
}, {
  timestamps: true,
  versionKey: false
});

// Indexes
productQuestionSchema.index({ product: 1, moderationStatus: 1, createdAt: -1 });
productQuestionSchema.index({ askedBy: 1, createdAt: -1 });
productQuestionSchema.index({ 'answers.answeredBy': 1 });
productQuestionSchema.index({ helpfulVotes: -1 });

// Methods
Object.assign(productQuestionSchema.methods, baseSchemaMethods);

// Moderate question
productQuestionSchema.methods.moderate = function(status, moderatorId, reason = null) {
  this.moderationStatus = status;
  this.moderatedBy = moderatorId;
  this.moderatedAt = new Date();
  if (reason) this.moderationReason = reason;
  return this.save();
};

// Add answer
productQuestionSchema.methods.addAnswer = function(answerData) {
  this.answers.push({
    ...answerData,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return this.save();
};

// Vote helpful
productQuestionSchema.methods.voteHelpful = function(userId) {
  const hasVoted = this.helpfulVoters.some(
    voter => voter.toString() === userId.toString()
  );
  
  if (hasVoted) {
    // Remove vote
    this.helpfulVoters = this.helpfulVoters.filter(
      voter => voter.toString() !== userId.toString()
    );
    this.helpfulVotes = Math.max(0, this.helpfulVotes - 1);
  } else {
    // Add vote
    this.helpfulVoters.push(userId);
    this.helpfulVotes += 1;
  }
  
  return this.save();
};

// Vote answer helpful
productQuestionSchema.methods.voteAnswerHelpful = function(answerId, userId) {
  const answer = this.answers.id(answerId);
  if (!answer) {
    throw new Error('پاسخ یافت نشد');
  }
  
  const hasVoted = answer.helpfulVoters.some(
    voter => voter.toString() === userId.toString()
  );
  
  if (hasVoted) {
    // Remove vote
    answer.helpfulVoters = answer.helpfulVoters.filter(
      voter => voter.toString() !== userId.toString()
    );
    answer.helpfulVotes = Math.max(0, answer.helpfulVotes - 1);
  } else {
    // Add vote
    answer.helpfulVoters.push(userId);
    answer.helpfulVotes += 1;
  }
  
  return this.save();
};

// Pre-save: Store author snapshot
productQuestionSchema.pre('save', async function(next) {
  if (this.isNew && this.askedBy) {
    const User = mongoose.model('User');
    const author = await User.findById(this.askedBy);
    if (author) {
      this.authorSnapshot = {
        name: author.name,
        avatar: author.avatar
      };
    }
  }
  next();
});

// Statics
Object.assign(productQuestionSchema.statics, baseSchemaStatics);

export const ProductQuestion = mongoose.model('ProductQuestion', productQuestionSchema);

