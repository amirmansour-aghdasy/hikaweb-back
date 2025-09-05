import { Comment } from './model.js';
import { Service } from '../services/model.js';
import { Article } from '../articles/model.js';
import { Portfolio } from '../portfolio/model.js';
import { AppError } from '../../utils/appError.js';
import { logger } from '../../utils/logger.js';
import { cacheService } from '../../services/cache.js';
import { notificationService } from '../../services/notification.js';

export class CommentService {
  static async createComment(data, userId = null) {
    try {
      // Verify reference exists
      await this.verifyReference(data.referenceType, data.referenceId);

      // Check for duplicate (same user, same reference, within 24 hours)
      if (userId) {
        const existingComment = await Comment.findOne({
          author: userId,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        if (existingComment) {
          throw new AppError('شما قبلاً برای این آیتم نظر ثبت کرده‌اید', 400);
        }
      }

      const comment = new Comment({
        ...data,
        author: userId,
        status: 'pending'
      });

      await comment.save();

      // Update reference rating average
      await this.updateReferenceRating(data.referenceType, data.referenceId);

      // Clear cache
      await cacheService.deletePattern(`comments:${data.referenceType}:${data.referenceId}:*`);

      // Send notification to moderators
      await notificationService.notifyModerators('comment_created', {
        commentId: comment._id,
        referenceType: data.referenceType,
        content: data.content.substring(0, 100) + '...'
      });

      logger.info('Comment created:', { id: comment._id, referenceType: data.referenceType });

      return comment;
    } catch (error) {
      logger.error('Error creating comment:', error);
      throw error;
    }
  }

  static async verifyReference(type, id) {
    let Model;
    switch (type) {
      case 'service':
        Model = Service;
        break;
      case 'article':
        Model = Article;
        break;
      case 'portfolio':
        Model = Portfolio;
        break;
      default:
        throw new AppError('نوع مرجع نامعتبر است', 400);
    }

    const reference = await Model.findById(id);
    if (!reference) {
      throw new AppError('مرجع مورد نظر یافت نشد', 404);
    }

    return reference;
  }

  static async getComments(query = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        status = 'approved',
        referenceType,
        referenceId,
        rating,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = query;

      const cacheKey = `comments:list:${JSON.stringify(query)}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const filter = { deletedAt: null };

      if (status && status !== 'all') {
        filter.status = status;
      }

      if (referenceType && referenceId) {
        filter.referenceType = referenceType;
        filter.referenceId = referenceId;
      }

      if (rating) {
        filter.rating = parseInt(rating);
      }

      if (search) {
        filter.content = { $regex: search, $options: 'i' };
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (page - 1) * limit;

      const [comments, total] = await Promise.all([
        Comment.find(filter)
          .populate('author', 'firstName lastName avatar')
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .select('-__v'),
        Comment.countDocuments(filter)
      ]);

      const result = {
        comments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };

      await cacheService.set(cacheKey, result, 300); // 5 minutes
      return result;
    } catch (error) {
      logger.error('Error getting comments:', error);
      throw error;
    }
  }

  static async getCommentsByReference(referenceType, referenceId, query = {}) {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;

      const cacheKey = `comments:${referenceType}:${referenceId}:${JSON.stringify(query)}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const filter = {
        referenceType,
        referenceId,
        status: 'approved',
        deletedAt: null
      };

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (page - 1) * limit;

      const [comments, total, stats] = await Promise.all([
        Comment.find(filter)
          .populate('author', 'firstName lastName avatar')
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .select('-__v'),
        Comment.countDocuments(filter),
        this.getCommentStats(referenceType, referenceId)
      ]);

      const result = {
        comments,
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };

      await cacheService.set(cacheKey, result, 600); // 10 minutes
      return result;
    } catch (error) {
      logger.error('Error getting comments by reference:', error);
      throw error;
    }
  }

  static async getCommentStats(referenceType, referenceId) {
    try {
      const stats = await Comment.aggregate([
        {
          $match: {
            referenceType,
            referenceId,
            status: 'approved',
            deletedAt: null
          }
        },
        {
          $group: {
            _id: null,
            totalComments: { $sum: 1 },
            averageRating: { $avg: '$rating' },
            ratingCounts: {
              $push: '$rating'
            }
          }
        },
        {
          $project: {
            _id: 0,
            totalComments: 1,
            averageRating: { $round: ['$averageRating', 1] },
            ratingDistribution: {
              1: { $size: { $filter: { input: '$ratingCounts', cond: { $eq: ['$$this', 1] } } } },
              2: { $size: { $filter: { input: '$ratingCounts', cond: { $eq: ['$$this', 2] } } } },
              3: { $size: { $filter: { input: '$ratingCounts', cond: { $eq: ['$$this', 3] } } } },
              4: { $size: { $filter: { input: '$ratingCounts', cond: { $eq: ['$$this', 4] } } } },
              5: { $size: { $filter: { input: '$ratingCounts', cond: { $eq: ['$$this', 5] } } } }
            }
          }
        }
      ]);

      return (
        stats[0] || {
          totalComments: 0,
          averageRating: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        }
      );
    } catch (error) {
      logger.error('Error getting comment stats:', error);
      throw error;
    }
  }

  static async updateComment(id, data, userId) {
    try {
      const comment = await Comment.findById(id);
      if (!comment || comment.deletedAt) {
        throw new AppError('نظر یافت نشد', 404);
      }

      // Only author can update content and rating
      if (comment.author && comment.author.toString() !== userId) {
        throw new AppError('شما مجاز به ویرایش این نظر نیستید', 403);
      }

      const oldRating = comment.rating;
      Object.assign(comment, data, { updatedBy: userId });
      await comment.save();

      // Update reference rating if rating changed
      if (data.rating && data.rating !== oldRating) {
        await this.updateReferenceRating(comment.referenceType, comment.referenceId);
      }

      // Clear cache
      await cacheService.deletePattern(
        `comments:${comment.referenceType}:${comment.referenceId}:*`
      );

      logger.info('Comment updated:', { id: comment._id });

      return comment;
    } catch (error) {
      logger.error('Error updating comment:', error);
      throw error;
    }
  }

  static async getPendingComments(limit = 10) {
    try {
      const comments = await Comment.find({
        status: 'pending',
        deletedAt: null
      })
        .populate('author', 'firstName lastName email')
        .sort({ createdAt: 1 })
        .limit(limit);

      return comments;
    } catch (error) {
      logger.error('Error getting pending comments:', error);
      throw error;
    }
  }

  static async moderateComment(id, data, userId) {
    try {
      const comment = await Comment.findById(id);
      if (!comment || comment.deletedAt) {
        throw new AppError('نظر یافت نشد', 404);
      }

      comment.status = data.status;
      comment.moderationNote = data.moderationNote;
      comment.moderatedBy = userId;
      comment.moderatedAt = new Date();
      comment.updatedBy = userId;

      await comment.save();

      // Update reference rating
      await this.updateReferenceRating(comment.referenceType, comment.referenceId);

      // Clear cache
      await cacheService.deletePattern(
        `comments:${comment.referenceType}:${comment.referenceId}:*`
      );

      // Notify comment author
      if (comment.author) {
        await notificationService.notifyUser(comment.author, 'comment_moderated', {
          status: data.status,
          content: comment.content.substring(0, 100) + '...'
        });
      }

      logger.info('Comment moderated:', { id: comment._id, status: data.status });

      return comment;
    } catch (error) {
      logger.error('Error moderating comment:', error);
      throw error;
    }
  }
}
