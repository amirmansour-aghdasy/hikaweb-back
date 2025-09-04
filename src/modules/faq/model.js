import mongoose from 'mongoose';
import {
  baseSchemaFields,
  baseSchemaMethods,
  baseSchemaStatics
} from '../../shared/models/BaseModel.js';

const faqSchema = new mongoose.Schema(
  {
    question: {
      fa: {
        type: String,
        required: [true, 'سوال فارسی الزامی است'],
        trim: true,
        maxLength: [300, 'سوال نمی‌تواند بیش از ۳۰۰ کاراکتر باشد']
      },
      en: {
        type: String,
        required: [true, 'سوال انگلیسی الزامی است'],
        trim: true,
        maxLength: [300, 'سوال نمی‌تواند بیش از ۳۰۰ کاراکتر باشد']
      }
    },

    answer: {
      fa: {
        type: String,
        required: [true, 'پاسخ فارسی الزامی است'],
        trim: true
      },
      en: {
        type: String,
        required: [true, 'پاسخ انگلیسی الزامی است'],
        trim: true
      }
    },

    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      default: null
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    },

    tags: {
      fa: [String],
      en: [String]
    },

    orderIndex: {
      type: Number,
      default: 0
    },

    isPopular: {
      type: Boolean,
      default: false
    },

    views: {
      type: Number,
      default: 0
    },

    helpfulVotes: {
      positive: { type: Number, default: 0 },
      negative: { type: Number, default: 0 }
    },

    ...baseSchemaFields
  },
  {
    timestamps: true,
    versionKey: false
  }
);

faqSchema.index({ service: 1, orderIndex: 1 });
faqSchema.index({ category: 1 });
faqSchema.index({ isPopular: -1 });
faqSchema.index({ views: -1 });
faqSchema.index({ 'question.fa': 'text', 'answer.fa': 'text' });
faqSchema.index({ 'question.en': 'text', 'answer.en': 'text' });

Object.assign(faqSchema.methods, baseSchemaMethods);
Object.assign(faqSchema.statics, baseSchemaStatics);

// Vote on FAQ helpfulness
faqSchema.methods.vote = function (isPositive) {
  if (isPositive) {
    this.helpfulVotes.positive += 1;
  } else {
    this.helpfulVotes.negative += 1;
  }
  return this.save();
};

export const FAQ = mongoose.model('FAQ', faqSchema);
