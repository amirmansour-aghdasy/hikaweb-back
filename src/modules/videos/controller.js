import { VideoService } from './service.js';
import { Video } from './model.js';
import { AppError } from '../../utils/appError.js';
import { HTTP_STATUS } from '../../utils/httpStatus.js';
import { handleCreate, handleUpdate, handleDelete, handleGetList } from '../../shared/controllers/baseController.js';

export class VideoController {
  static async createVideo(req, res, next) {
    await handleCreate(
      req, res, next,
      VideoService.createVideo,
      'video',
      'ویدئو با موفقیت ایجاد شد'
    );
  }

  static async updateVideo(req, res, next) {
    await handleUpdate(
      req, res, next,
      VideoService.updateVideo,
      'video',
      'ویدئو با موفقیت به‌روزرسانی شد'
    );
  }

  static async deleteVideo(req, res, next) {
    await handleDelete(
      req, res, next,
      VideoService.deleteVideo,
      'video',
      'ویدئو با موفقیت حذف شد'
    );
  }

  static async getVideos(req, res, next) {
    await handleGetList(req, res, next, VideoService.getVideos);
  }

  static async getVideoBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const language = req.query.lang || req.headers['accept-language']?.includes('en') ? 'en' : 'fa';
      
      const video = await VideoService.getVideoBySlug(slug, language);

      res.json({
        success: true,
        data: { video }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVideoById(req, res, next) {
    try {
      const { id } = req.params;
      const video = await Video.findById(id)
        .populate('author', 'name email avatar')
        .populate('categories', 'name slug')
        .populate('relatedServices', 'name slug')
        .populate('relatedPortfolios', 'title slug')
        .populate('relatedArticles', 'title slug');

      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'ویدئو یافت نشد'
        });
      }

      res.json({
        success: true,
        data: { video }
      });
    } catch (error) {
      next(error);
    }
  }

  static async trackView(req, res, next) {
    try {
      const { id } = req.params;
      const userIdentifier = VideoService.generateUserIdentifier(req);
      const userId = req.user?.id || null;
      const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || null;
      const userAgent = req.headers['user-agent'] || null;
      const { watchTime = 0, completionPercentage = 0 } = req.body;

      const result = await VideoService.trackView(
        id,
        userIdentifier,
        userId,
        ip,
        userAgent,
        watchTime,
        completionPercentage
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleLike(req, res, next) {
    try {
      const { id } = req.params;
      const userIdentifier = VideoService.generateUserIdentifier(req);
      const userId = req.user?.id || null;

      const result = await VideoService.toggleLike(id, userIdentifier, userId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async checkLike(req, res, next) {
    try {
      const { id } = req.params;
      const userIdentifier = VideoService.generateUserIdentifier(req);

      const hasLiked = await VideoService.hasLiked(id, userIdentifier);

      res.json({
        success: true,
        data: { liked: hasLiked }
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleBookmark(req, res, next) {
    try {
      if (!req.user?.id) {
        throw new AppError('برای بوکمارک کردن باید وارد حساب کاربری خود شوید', HTTP_STATUS.UNAUTHORIZED);
      }

      const { id } = req.params;
      const { note } = req.body;

      const result = await VideoService.toggleBookmark(id, req.user.id, note);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async checkBookmark(req, res, next) {
    try {
      if (!req.user?.id) {
        return res.json({
          success: true,
          data: { bookmarked: false }
        });
      }

      const { id } = req.params;
      const hasBookmarked = await VideoService.hasBookmarked(id, req.user.id);

      res.json({
        success: true,
        data: { bookmarked: hasBookmarked }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVideoStats(req, res, next) {
    try {
      const { id } = req.params;
      const stats = await VideoService.getVideoStats(id);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRelatedContent(req, res, next) {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit) || 4;
      const relatedContent = await VideoService.getRelatedContent(id, limit);

      res.json({
        success: true,
        data: relatedContent
      });
    } catch (error) {
      next(error);
    }
  }

  static async getFeaturedVideos(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 6;
      const result = await VideoService.getVideos({
        isFeatured: true,
        isPublished: true,
        limit,
        sortBy: 'publishedAt',
        sortOrder: 'desc'
      });

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }
}

