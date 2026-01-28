import { ProductQuestion } from './model.js';
import { Product } from '../products/model.js';
import { logger } from '../../utils/logger.js';

/**
 * ProductQuestionService - Service for product Q&A
 * 
 * Features:
 * - Ask questions
 * - Answer questions
 * - Moderation
 * - Helpful votes
 * - Search and filter
 */
export class ProductQuestionService {
  /**
   * Ask a question
   */
  static async askQuestion(productId, question, userId) {
    try {
      const product = await Product.findById(productId);
      if (!product || product.deletedAt) {
        throw new Error('محصول یافت نشد');
      }

      // Check for duplicate question (same user, same product, within 24 hours)
      const existingQuestion = await ProductQuestion.findOne({
        product: productId,
        askedBy: userId,
        question: { $regex: new RegExp(`^${question.trim()}$`, 'i') },
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      if (existingQuestion) {
        throw new Error('شما قبلاً این سوال را پرسیده‌اید');
      }

      // Check if user has purchased (for verified purchase badge)
      // TODO: Implement purchase verification
      const isVerifiedPurchase = false;

      const productQuestion = new ProductQuestion({
        product: productId,
        question: question.trim(),
        askedBy: userId,
        isVerifiedPurchase,
        moderationStatus: 'pending'
      });

      await productQuestion.save();
      await productQuestion.populate('askedBy', 'name avatar');

      logger.info(`Product question asked: ${productQuestion._id} for product ${productId}`);
      return productQuestion;
    } catch (error) {
      logger.error('Ask question error:', error);
      throw error;
    }
  }

  /**
   * Answer a question
   */
  static async answerQuestion(questionId, answer, userId, isVendor = false) {
    try {
      const productQuestion = await ProductQuestion.findById(questionId);
      if (!productQuestion || productQuestion.deletedAt) {
        throw new Error('سوال یافت نشد');
      }

      // Check if question is approved
      if (productQuestion.moderationStatus !== 'approved') {
        throw new Error('سوال تایید نشده است');
      }

      // Check if user already answered
      const hasAnswered = productQuestion.answers.some(
        ans => ans.answeredBy.toString() === userId.toString()
      );

      if (hasAnswered && !isVendor) {
        throw new Error('شما قبلاً به این سوال پاسخ داده‌اید');
      }

      // Add answer
      await productQuestion.addAnswer({
        answer: answer.trim(),
        answeredBy: userId,
        isVendorAnswer: isVendor,
        moderationStatus: isVendor ? 'approved' : 'pending'
      });

      await productQuestion.populate('answers.answeredBy', 'name avatar');
      await productQuestion.populate('askedBy', 'name avatar');

      logger.info(`Question answered: ${questionId} by user ${userId}`);
      return productQuestion;
    } catch (error) {
      logger.error('Answer question error:', error);
      throw error;
    }
  }

  /**
   * Get questions for a product
   */
  static async getProductQuestions(productId, filters = {}) {
    try {
      const {
        page = 1,
        limit = 25,
        search = '',
        moderationStatus = 'approved',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      const parsedPage = parseInt(page);
      const parsedLimit = parseInt(limit);
      const skip = (parsedPage - 1) * parsedLimit;

      let query = {
        product: productId,
        deletedAt: null
      };

      // Moderation filter
      if (moderationStatus && moderationStatus !== 'all') {
        query.moderationStatus = moderationStatus;
      }

      // Search filter
      if (search && search.trim() !== '') {
        query.$or = [
          { question: new RegExp(search, 'i') },
          { 'answers.answer': new RegExp(search, 'i') }
        ];
      }

      // Sort options
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const [questions, total] = await Promise.all([
        ProductQuestion.find(query)
          .populate('askedBy', 'name avatar')
          .populate('answers.answeredBy', 'name avatar')
          .sort(sortOptions)
          .skip(skip)
          .limit(parsedLimit),
        ProductQuestion.countDocuments(query)
      ]);

      // Filter answers by moderation status
      questions.forEach(question => {
        question.answers = question.answers.filter(
          answer => answer.moderationStatus === 'approved'
        );
      });

      return {
        data: questions,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit),
          hasNext: parsedPage < Math.ceil(total / parsedLimit),
          hasPrev: parsedPage > 1
        }
      };
    } catch (error) {
      logger.error('Get product questions error:', error);
      throw error;
    }
  }

  /**
   * Get question by ID
   */
  static async getQuestionById(questionId) {
    try {
      const question = await ProductQuestion.findOne({
        _id: questionId,
        deletedAt: null
      })
        .populate('askedBy', 'name avatar')
        .populate('answers.answeredBy', 'name avatar')
        .populate('product', 'name slug');

      if (!question) {
        throw new Error('سوال یافت نشد');
      }

      // Filter approved answers only
      question.answers = question.answers.filter(
        answer => answer.moderationStatus === 'approved'
      );

      return question;
    } catch (error) {
      logger.error('Get question by ID error:', error);
      throw error;
    }
  }

  /**
   * Vote question as helpful
   */
  static async voteHelpful(questionId, userId) {
    try {
      const question = await ProductQuestion.findById(questionId);
      if (!question || question.deletedAt) {
        throw new Error('سوال یافت نشد');
      }

      await question.voteHelpful(userId);
      return { helpfulVotes: question.helpfulVotes };
    } catch (error) {
      logger.error('Vote helpful error:', error);
      throw error;
    }
  }

  /**
   * Vote answer as helpful
   */
  static async voteAnswerHelpful(questionId, answerId, userId) {
    try {
      const question = await ProductQuestion.findById(questionId);
      if (!question || question.deletedAt) {
        throw new Error('سوال یافت نشد');
      }

      await question.voteAnswerHelpful(answerId, userId);
      const answer = question.answers.id(answerId);
      return { helpfulVotes: answer.helpfulVotes };
    } catch (error) {
      logger.error('Vote answer helpful error:', error);
      throw error;
    }
  }

  /**
   * Moderate question
   */
  static async moderateQuestion(questionId, status, moderatorId, reason = null) {
    try {
      const question = await ProductQuestion.findById(questionId);
      if (!question) {
        throw new Error('سوال یافت نشد');
      }

      await question.moderate(status, moderatorId, reason);
      return question;
    } catch (error) {
      logger.error('Moderate question error:', error);
      throw error;
    }
  }

  /**
   * Moderate answer
   */
  static async moderateAnswer(questionId, answerId, status, moderatorId) {
    try {
      const question = await ProductQuestion.findById(questionId);
      if (!question) {
        throw new Error('سوال یافت نشد');
      }

      const answer = question.answers.id(answerId);
      if (!answer) {
        throw new Error('پاسخ یافت نشد');
      }

      answer.moderationStatus = status;
      answer.moderatedBy = moderatorId;
      answer.moderatedAt = new Date();
      await question.save();

      return question;
    } catch (error) {
      logger.error('Moderate answer error:', error);
      throw error;
    }
  }

  /**
   * Delete question (soft delete)
   */
  static async deleteQuestion(questionId, userId) {
    try {
      const question = await ProductQuestion.findById(questionId);
      if (!question) {
        throw new Error('سوال یافت نشد');
      }

      // Check ownership or admin
      if (question.askedBy.toString() !== userId.toString()) {
        // TODO: Check if user is admin
        throw new Error('شما اجازه حذف این سوال را ندارید');
      }

      await question.softDelete(userId);
      return true;
    } catch (error) {
      logger.error('Delete question error:', error);
      throw error;
    }
  }
}

