import { BannerService } from './service.js';
import { Banner } from './model.js';
import { logger } from '../../utils/logger.js';
import { handleCreate, handleUpdate, handleDelete, handleGetList } from '../../shared/controllers/baseController.js';

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
    await handleCreate(
      req, res, next,
      BannerService.createBanner,
      'banner',
      'بنر با موفقیت ایجاد شد'
    );
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
    await handleGetList(req, res, next, BannerService.getBanners);
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
   *       - in: query
   *         name: serviceSlug
   *         schema:
   *           type: string
   *         description: Slug خدمت برای دریافت بنر مخصوص آن خدمت
   */
  static async getActiveBanners(req, res, next) {
    try {
      const { position } = req.params;
      const { serviceSlug } = req.query;
      const banners = await BannerService.getActiveBanners(position, serviceSlug);

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
   * /api/v1/banners/service/{serviceSlug}:
   *   get:
   *     summary: دریافت بنر صفحه خدمت
   *     tags: [Banners]
   *     parameters:
   *       - in: path
   *         name: serviceSlug
   *         required: true
   *         schema:
   *           type: string
   *         description: Slug خدمت
   */
  static async getServiceBanner(req, res, next) {
    try {
      const { serviceSlug } = req.params;
      const banner = await BannerService.getServiceBanner(serviceSlug);

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
    await handleUpdate(
      req, res, next,
      BannerService.updateBanner,
      'banner',
      'بنر با موفقیت به‌روزرسانی شد'
    );
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
    await handleDelete(
      req, res, next,
      BannerService.deleteBanner,
      'banner',
      'بنر با موفقیت حذف شد'
    );
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

