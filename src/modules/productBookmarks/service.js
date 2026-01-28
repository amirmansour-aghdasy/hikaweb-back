import { ProductBookmark } from './model.js';
import { Product } from '../products/model.js';
import { logger } from '../../utils/logger.js';

/**
 * ProductBookmarkService - Service for product bookmarks
 * 
 * Features:
 * - Toggle bookmark
 * - Get user bookmarks with search
 * - Check bookmark status
 * - Efficient queries with pagination
 */
export class ProductBookmarkService {
  /**
   * Toggle bookmark for a product
   */
  static async toggleBookmark(productId, userId) {
    try {
      const product = await Product.findById(productId);
      if (!product || product.deletedAt) {
        throw new Error('محصول یافت نشد');
      }

      // First, check for active bookmark
      const existingBookmark = await ProductBookmark.findOne({ 
        user: userId, 
        product: productId,
        deletedAt: null
      });

      if (existingBookmark) {
        // Unbookmark - soft delete
        await existingBookmark.softDelete();
        return { isBookmarked: false };
      } else {
        // Bookmark - create new or restore deleted
        let bookmark = await ProductBookmark.findOne({ 
          user: userId, 
          product: productId 
        });
        
        if (bookmark && bookmark.deletedAt) {
          // Restore deleted bookmark
          bookmark.deletedAt = null;
          await bookmark.save();
        } else {
          // Create new bookmark
          bookmark = new ProductBookmark({
            user: userId,
            product: productId
          });
          await bookmark.save();
        }
        
        return { isBookmarked: true };
      }
    } catch (error) {
      logger.error('Product bookmark toggle error:', error);
      throw error;
    }
  }

  /**
   * Get user bookmarks with filters
   */
  static async getUserBookmarks(userId, filters = {}) {
    try {
      const { page = 1, limit = 25, search = '', language = 'fa' } = filters;
      const parsedPage = parseInt(page);
      const parsedLimit = parseInt(limit);
      const skip = (parsedPage - 1) * parsedLimit;

      // Build query
      let bookmarkQuery = { user: userId, deletedAt: null };
      
      // Handle search - search in product name and description
      let productQuery = {};
      if (search && search.trim() !== '') {
        productQuery = {
          $or: [
            { [`name.${language}`]: new RegExp(search, 'i') },
            { [`name.fa`]: new RegExp(search, 'i') },
            { [`name.en`]: new RegExp(search, 'i') },
            { name: new RegExp(search, 'i') },
            { [`description.${language}`]: new RegExp(search, 'i') },
            { [`description.fa`]: new RegExp(search, 'i') },
            { [`description.en`]: new RegExp(search, 'i') },
            { description: new RegExp(search, 'i') },
            { [`shortDescription.${language}`]: new RegExp(search, 'i') },
            { [`shortDescription.fa`]: new RegExp(search, 'i') },
            { [`shortDescription.en`]: new RegExp(search, 'i') },
            { shortDescription: new RegExp(search, 'i') },
            { sku: new RegExp(search, 'i') }
          ]
        };
      }

      // Find bookmarks with populated products
      let bookmarksQuery = ProductBookmark.find(bookmarkQuery)
        .populate({
          path: 'product',
          select: 'name slug featuredImage shortDescription pricing rating views type sku',
          match: search ? productQuery : { deletedAt: null, status: 'active', isPublished: true }
        })
        .sort({ createdAt: -1 });

      let bookmarks = await bookmarksQuery.exec();
      
      // Filter out bookmarks with null products and apply search filter
      bookmarks = bookmarks.filter(b => {
        if (!b.product) return false;
        if (!search || search.trim() === '') return true;
        
        // Additional client-side filtering for search
        const name = b.product.name?.fa || b.product.name?.en || b.product.name || '';
        const shortDesc = b.product.shortDescription?.fa || b.product.shortDescription?.en || b.product.shortDescription || '';
        const sku = b.product.sku || '';
        const searchLower = search.toLowerCase();
        
        return name.toLowerCase().includes(searchLower) ||
               shortDesc.toLowerCase().includes(searchLower) ||
               sku.toLowerCase().includes(searchLower);
      });

      // Get total count
      const total = search 
        ? bookmarks.length
        : await ProductBookmark.countDocuments(bookmarkQuery);

      // Apply pagination
      const paginatedBookmarks = bookmarks.slice(skip, skip + parsedLimit);
      
      // Extract products from bookmarks
      const products = paginatedBookmarks.map(b => b.product).filter(Boolean);
      
      const totalPages = Math.ceil((search ? bookmarks.length : total) / parsedLimit);

      return {
        data: products,
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
      logger.error('Get product bookmarks error:', error);
      throw error;
    }
  }

  /**
   * Check if product is bookmarked
   */
  static async isBookmarked(productId, userId) {
    try {
      const bookmark = await ProductBookmark.findOne({ 
        user: userId, 
        product: productId, 
        deletedAt: null 
      });
      return !!bookmark;
    } catch (error) {
      logger.error('Check product bookmark error:', error);
      return false;
    }
  }

  /**
   * Get bookmark count for a product
   */
  static async getBookmarkCount(productId) {
    try {
      const count = await ProductBookmark.countDocuments({
        product: productId,
        deletedAt: null
      });
      return count;
    } catch (error) {
      logger.error('Get product bookmark count error:', error);
      return 0;
    }
  }
}

