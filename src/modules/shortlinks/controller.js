import { ShortLinkService } from './service.js';
import { AppError } from '../../utils/appError.js';
import { HTTP_STATUS } from '../../utils/httpStatus.js';

export class ShortLinkController {
  /**
   * Create a short link
   */
  static async createShortLink(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const shortLink = await ShortLinkService.createShortLink(req.body, userId);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: { shortLink }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get or create short link for a resource
   */
  static async getOrCreateShortLink(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const { originalUrl, resourceType, resourceId } = req.body;

      if (!originalUrl) {
        throw new AppError('آدرس اصلی الزامی است', HTTP_STATUS.BAD_REQUEST);
      }

      const shortLink = await ShortLinkService.getOrCreateShortLink(
        originalUrl,
        resourceType,
        resourceId,
        userId
      );

      res.json({
        success: true,
        data: { shortLink }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Redirect to original URL (Public)
   */
  static async redirectShortLink(req, res, next) {
    try {
      const { code } = req.params;
      const shortLink = await ShortLinkService.getShortLinkByCode(code);

      // Redirect to original URL
      res.redirect(301, shortLink.originalUrl);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get short link by code (Public - returns JSON)
   */
  static async getShortLinkByCode(req, res, next) {
    try {
      const { code } = req.params;
      const shortLink = await ShortLinkService.getShortLinkByCode(code);

      res.json({
        success: true,
        data: { shortLink }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get short link by resource
   */
  static async getShortLinkByResource(req, res, next) {
    try {
      const { resourceType, resourceId } = req.params;
      const shortLink = await ShortLinkService.getShortLinkByResource(resourceType, resourceId);

      // Return null if not found (not an error - will be created if needed)
      res.json({
        success: true,
        data: { shortLink: shortLink || null }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all short links
   */
  static async getShortLinks(req, res, next) {
    try {
      const result = await ShortLinkService.getShortLinks(req.query);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update short link
   */
  static async updateShortLink(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const shortLink = await ShortLinkService.updateShortLink(id, req.body, userId);

      res.json({
        success: true,
        data: { shortLink }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete short link
   */
  static async deleteShortLink(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      await ShortLinkService.deleteShortLink(id, userId);

      res.json({
        success: true,
        message: 'لینک کوتاه با موفقیت حذف شد'
      });
    } catch (error) {
      next(error);
    }
  }
}

