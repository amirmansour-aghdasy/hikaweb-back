import { Bookmark } from './model.js';
import { Article } from '../articles/model.js';
import { logger } from '../../utils/logger.js';

export class BookmarkService {
  static async toggleBookmark(articleId, userId) {
    try {
      const article = await Article.findById(articleId);
      if (!article || article.deletedAt) {
        throw new Error('مقاله یافت نشد');
      }

      const existingBookmark = await Bookmark.findOne({ user: userId, article: articleId });

      if (existingBookmark) {
        await existingBookmark.softDelete();
        return { isBookmarked: false };
      } else {
        const bookmark = new Bookmark({
          user: userId,
          article: articleId
        });
        await bookmark.save();
        return { isBookmarked: true };
      }
    } catch (error) {
      logger.error('Bookmark toggle error:', error);
      throw error;
    }
  }

  static async getUserBookmarks(userId, filters = {}) {
    try {
      const { page = 1, limit = 25 } = filters;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [bookmarks, total] = await Promise.all([
        Bookmark.find({ user: userId, deletedAt: null })
          .populate('article', 'title slug featuredImage excerpt publishedAt readTime views')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Bookmark.countDocuments({ user: userId, deletedAt: null })
      ]);

      return {
        data: bookmarks.map(b => b.article).filter(Boolean),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      };
    } catch (error) {
      logger.error('Get bookmarks error:', error);
      throw error;
    }
  }

  static async isBookmarked(articleId, userId) {
    try {
      const bookmark = await Bookmark.findOne({ 
        user: userId, 
        article: articleId, 
        deletedAt: null 
      });
      return !!bookmark;
    } catch (error) {
      logger.error('Check bookmark error:', error);
      return false;
    }
  }
}

