import { ProductLike } from './model.js';
import { Product } from '../products/model.js';
import { logger } from '../../utils/logger.js';

/**
 * ProductLikeService - Service for product likes
 * 
 * Features:
 * - Toggle like
 * - Get user likes
 * - Check like status
 * - Get like count
 * - Update product like count
 */
export class ProductLikeService {
  /**
   * Toggle like for a product
   */
  static async toggleLike(productId, userId) {
    try {
      const product = await Product.findById(productId);
      if (!product || product.deletedAt) {
        throw new Error('محصول یافت نشد');
      }

      const existingLike = await ProductLike.findOne({ 
        user: userId, 
        product: productId,
        deletedAt: null
      });

      if (existingLike) {
        // Unlike - soft delete
        await existingLike.softDelete();
        
        // Update product like count
        if (product.likes && product.likes > 0) {
          product.likes = Math.max(0, product.likes - 1);
          await product.save();
        }
        
        return { isLiked: false, likes: product.likes || 0 };
      } else {
        // Like - create new or restore deleted
        let like = await ProductLike.findOne({ 
          user: userId, 
          product: productId 
        });
        
        if (like && like.deletedAt) {
          // Restore deleted like
          like.deletedAt = null;
          await like.save();
        } else {
          // Create new like
          like = new ProductLike({
            user: userId,
            product: productId
          });
          await like.save();
        }
        
        // Update product like count
        product.likes = (product.likes || 0) + 1;
        await product.save();
        
        return { isLiked: true, likes: product.likes };
      }
    } catch (error) {
      logger.error('Product like toggle error:', error);
      throw error;
    }
  }

  /**
   * Get user liked products
   */
  static async getUserLikes(userId, filters = {}) {
    try {
      const { page = 1, limit = 25, search = '', language = 'fa' } = filters;
      const parsedPage = parseInt(page);
      const parsedLimit = parseInt(limit);
      const skip = (parsedPage - 1) * parsedLimit;

      // Build query
      let likeQuery = { user: userId, deletedAt: null };
      
      // Handle search
      let productQuery = {};
      if (search && search.trim() !== '') {
        productQuery = {
          $or: [
            { [`name.${language}`]: new RegExp(search, 'i') },
            { [`name.fa`]: new RegExp(search, 'i') },
            { [`name.en`]: new RegExp(search, 'i') },
            { name: new RegExp(search, 'i') },
            { sku: new RegExp(search, 'i') }
          ]
        };
      }

      // Find likes with populated products
      let likesQuery = ProductLike.find(likeQuery)
        .populate({
          path: 'product',
          select: 'name slug featuredImage shortDescription pricing rating views type sku likes',
          match: search ? productQuery : { deletedAt: null, status: 'active', isPublished: true }
        })
        .sort({ createdAt: -1 });

      let likes = await likesQuery.exec();
      
      // Filter out likes with null products
      likes = likes.filter(l => l.product);

      // Get total count
      const total = search 
        ? likes.length
        : await ProductLike.countDocuments(likeQuery);

      // Apply pagination
      const paginatedLikes = likes.slice(skip, skip + parsedLimit);
      
      // Extract products from likes
      const products = paginatedLikes.map(l => l.product).filter(Boolean);
      
      const totalPages = Math.ceil((search ? likes.length : total) / parsedLimit);

      return {
        data: products,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total: search ? likes.length : total,
          totalPages,
          hasNext: parsedPage < totalPages,
          hasPrev: parsedPage > 1
        }
      };
    } catch (error) {
      logger.error('Get product likes error:', error);
      throw error;
    }
  }

  /**
   * Check if product is liked
   */
  static async isLiked(productId, userId) {
    try {
      const like = await ProductLike.findOne({ 
        user: userId, 
        product: productId, 
        deletedAt: null 
      });
      return !!like;
    } catch (error) {
      logger.error('Check product like error:', error);
      return false;
    }
  }

  /**
   * Get like count for a product
   */
  static async getLikeCount(productId) {
    try {
      const count = await ProductLike.countDocuments({
        product: productId,
        deletedAt: null
      });
      return count;
    } catch (error) {
      logger.error('Get product like count error:', error);
      return 0;
    }
  }

  /**
   * Sync like counts for all products (maintenance job)
   */
  static async syncLikeCounts() {
    try {
      const products = await Product.find({ deletedAt: null });
      let synced = 0;
      
      for (const product of products) {
        const actualCount = await this.getLikeCount(product._id);
        if (product.likes !== actualCount) {
          product.likes = actualCount;
          await product.save();
          synced++;
        }
      }
      
      logger.info(`Synced like counts for ${synced} products`);
      return synced;
    } catch (error) {
      logger.error('Sync like counts error:', error);
      throw error;
    }
  }
}

