import { ProductBookmarkService } from './service.js';
import { logger } from '../../utils/logger.js';

/**
 * ProductBookmarkController - Controller for product bookmarks
 */
export class ProductBookmarkController {
  /**
   * Toggle bookmark
   * POST /api/v1/products/:id/bookmark
   */
  static async toggleBookmark(req, res, next) {
    try {
      const result = await ProductBookmarkService.toggleBookmark(
        req.params.id,
        req.user.id
      );
      res.json({
        success: true,
        message: result.isBookmarked 
          ? 'محصول به نشان‌ها اضافه شد' 
          : 'محصول از نشان‌ها حذف شد',
        data: result
      });
    } catch (error) {
      logger.error('Toggle product bookmark error:', error);
      next(error);
    }
  }

  /**
   * Get user bookmarks
   * GET /api/v1/products/bookmarks
   */
  static async getUserBookmarks(req, res, next) {
    try {
      const result = await ProductBookmarkService.getUserBookmarks(
        req.user.id,
        req.query
      );
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Get product bookmarks error:', error);
      next(error);
    }
  }

  /**
   * Check bookmark status
   * GET /api/v1/products/:id/bookmark
   */
  static async checkBookmark(req, res, next) {
    try {
      const isBookmarked = await ProductBookmarkService.isBookmarked(
        req.params.id,
        req.user.id
      );
      res.json({
        success: true,
        data: { isBookmarked }
      });
    } catch (error) {
      logger.error('Check product bookmark error:', error);
      next(error);
    }
  }
}

