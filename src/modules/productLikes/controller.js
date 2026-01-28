import { ProductLikeService } from './service.js';
import { logger } from '../../utils/logger.js';

/**
 * ProductLikeController - Controller for product likes
 */
export class ProductLikeController {
  /**
   * Toggle like
   * POST /api/v1/products/:id/like
   */
  static async toggleLike(req, res, next) {
    try {
      const result = await ProductLikeService.toggleLike(
        req.params.id,
        req.user.id
      );
      res.json({
        success: true,
        message: result.isLiked 
          ? 'محصول لایک شد' 
          : 'لایک محصول حذف شد',
        data: result
      });
    } catch (error) {
      logger.error('Toggle product like error:', error);
      next(error);
    }
  }

  /**
   * Get user likes
   * GET /api/v1/products/likes
   */
  static async getUserLikes(req, res, next) {
    try {
      const result = await ProductLikeService.getUserLikes(
        req.user.id,
        req.query
      );
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Get product likes error:', error);
      next(error);
    }
  }

  /**
   * Check like status
   * GET /api/v1/products/:id/like
   */
  static async checkLike(req, res, next) {
    try {
      const isLiked = await ProductLikeService.isLiked(
        req.params.id,
        req.user?.id || null
      );
      res.json({
        success: true,
        data: { isLiked }
      });
    } catch (error) {
      logger.error('Check product like error:', error);
      next(error);
    }
  }

  /**
   * Get like count
   * GET /api/v1/products/:id/likes/count
   */
  static async getLikeCount(req, res, next) {
    try {
      const count = await ProductLikeService.getLikeCount(req.params.id);
      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      logger.error('Get product like count error:', error);
      next(error);
    }
  }
}

