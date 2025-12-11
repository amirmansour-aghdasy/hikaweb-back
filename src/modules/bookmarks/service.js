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
      const { page = 1, limit = 25, search = '' } = filters;
      const parsedPage = parseInt(page);
      const parsedLimit = parseInt(limit);
      const skip = (parsedPage - 1) * parsedLimit;

      // Build query
      let bookmarkQuery = { user: userId, deletedAt: null };
      
      // Handle search - search in article title and excerpt
      let articleQuery = {};
      if (search) {
        articleQuery = {
          $or: [
            { 'title.fa': new RegExp(search, 'i') },
            { 'title.en': new RegExp(search, 'i') },
            { title: new RegExp(search, 'i') }, // Fallback for non-multilingual titles
            { 'excerpt.fa': new RegExp(search, 'i') },
            { 'excerpt.en': new RegExp(search, 'i') },
            { excerpt: new RegExp(search, 'i') }, // Fallback for non-multilingual excerpts
            { 'shortDescription.fa': new RegExp(search, 'i') },
            { 'shortDescription.en': new RegExp(search, 'i') },
            { shortDescription: new RegExp(search, 'i') }
          ]
        };
      }

      // First, find bookmarks
      let bookmarksQuery = Bookmark.find(bookmarkQuery)
        .populate({
          path: 'article',
          select: 'title slug featuredImage excerpt publishedAt readTime views shortDescription',
          match: search ? articleQuery : {}
        })
        .sort({ createdAt: -1 });

      // If search is provided, we need to filter after population
      // This is less efficient but necessary for searching in populated fields
      let bookmarks = await bookmarksQuery.exec();
      
      // Filter out bookmarks with null articles (from populate match) and apply search filter
      bookmarks = bookmarks.filter(b => {
        if (!b.article) return false;
        if (!search) return true;
        
        // Additional client-side filtering for search (populate match might not catch all cases)
        const title = b.article.title?.fa || b.article.title?.en || b.article.title || '';
        const excerpt = b.article.excerpt?.fa || b.article.excerpt?.en || b.article.excerpt || '';
        const shortDesc = b.article.shortDescription?.fa || b.article.shortDescription?.en || b.article.shortDescription || '';
        const searchLower = search.toLowerCase();
        
        return title.toLowerCase().includes(searchLower) ||
               excerpt.toLowerCase().includes(searchLower) ||
               shortDesc.toLowerCase().includes(searchLower);
      });

      // Get total count (for pagination)
      const total = search 
        ? bookmarks.length // If searching, total is filtered results
        : await Bookmark.countDocuments(bookmarkQuery);

      // Apply pagination
      const paginatedBookmarks = bookmarks.slice(skip, skip + parsedLimit);
      
      // Extract articles from bookmarks
      const articles = paginatedBookmarks.map(b => b.article).filter(Boolean);
      
      const totalPages = Math.ceil((search ? bookmarks.length : total) / parsedLimit);

      return {
        data: articles,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total: search ? bookmarks.length : total,
          totalPages,
          hasNext: parsedPage < totalPages,
          hasPrev: parsedPage > 1
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

