import { BannerService } from './service.js';
import { Banner } from './model.js';
import { logger } from '../../utils/logger.js';

export class BannerController {
  /**
   * @swagger
   * /api/v1/banners:
   *   post:
   *     summary: ایجاد بنر جدید
   *     tags: [Banners]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - image
   *               - link
   */
  static async createBanner(req, res, next) {
    try {
      const banner = await BannerService.createBanner(req.body, req.user.id);

      res.status(201).json({
        success: true,
        message: 'بنر با موفقیت ایجاد شد',
        data: { banner }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/banners:
   *   get:
   *     summary: دریافت لیست بنرها
   *     tags: [Banners]
   *     parameters:
   *       - in: query
   *         name: position
   *         schema:
   *           type: string
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   */
  static async getBanners(req, res, next) {
    try {
      const result = await BannerService.getBanners(req.query);

      res.json({
        success: true,
        data: { banners: result.data || result },
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/banners/active/{position}:
   *   get:
   *     summary: دریافت بنرهای فعال
   *     tags: [Banners]
   *     parameters:
   *       - in: path
   *         name: position
   *         required: true
   *         schema:
   *           type: string
   */
  static async getActiveBanners(req, res, next) {
    try {
      const { position } = req.params;
      const banners = await BannerService.getActiveBanners(position);

      res.json({
        success: true,
        data: { banners }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/banners/{id}:
   *   get:
   *     summary: دریافت بنر بر اساس ID
   *     tags: [Banners]
   */
  static async getBannerById(req, res, next) {
    try {
      const { id } = req.params;
      const banner = await BannerService.getBannerById(id);

      res.json({
        success: true,
        data: { banner }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/banners/{id}:
   *   put:
   *     summary: به‌روزرسانی بنر
   *     tags: [Banners]
   *     security:
   *       - bearerAuth: []
   */
  static async updateBanner(req, res, next) {
    try {
      const { id } = req.params;
      const banner = await BannerService.updateBanner(id, req.body, req.user.id);

      res.json({
        success: true,
        message: 'بنر با موفقیت به‌روزرسانی شد',
        data: { banner }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/banners/{id}:
   *   delete:
   *     summary: حذف بنر
   *     tags: [Banners]
   *     security:
   *       - bearerAuth: []
   */
  static async deleteBanner(req, res, next) {
    try {
      const { id } = req.params;
      await BannerService.deleteBanner(id, req.user.id);

      res.json({
        success: true,
        message: 'بنر با موفقیت حذف شد'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/banners/order:
   *   put:
   *     summary: به‌روزرسانی ترتیب بنرها
   *     tags: [Banners]
   *     security:
   *       - bearerAuth: []
   */
  static async updateOrder(req, res, next) {
    try {
      const { bannerIds } = req.body;
      await BannerService.updateOrder(bannerIds, req.user.id);

      res.json({
        success: true,
        message: 'ترتیب بنرها با موفقیت به‌روزرسانی شد'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Track banner view
   */
  static async trackView(req, res, next) {
    try {
      const { id } = req.params;
      const banner = await Banner.findById(id);
      
      if (banner) {
        await banner.trackView();
      }

      res.json({
        success: true
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Track banner click
   */
  static async trackClick(req, res, next) {
    try {
      const { id } = req.params;
      const banner = await Banner.findById(id);
      
      if (banner) {
        await banner.trackClick();
      }

      res.json({
        success: true
      });
    } catch (error) {
      next(error);
    }
  }
}

