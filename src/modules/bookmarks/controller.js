import { BookmarkService } from './service.js';
import { logger } from '../../utils/logger.js';

export class BookmarkController {
  static async toggleBookmark(req, res, next) {
    try {
      const result = await BookmarkService.toggleBookmark(req.params.id, req.user.id);
      res.json({
        success: true,
        message: result.isBookmarked ? 'مقاله به نشان‌ها اضافه شد' : 'مقاله از نشان‌ها حذف شد',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserBookmarks(req, res, next) {
    try {
      const result = await BookmarkService.getUserBookmarks(req.user.id, req.query);
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  static async checkBookmark(req, res, next) {
    try {
      const isBookmarked = await BookmarkService.isBookmarked(req.params.id, req.user.id);
      res.json({
        success: true,
        data: { isBookmarked }
      });
    } catch (error) {
      next(error);
    }
  }
}

