import { BrandService } from './service.js';
import { Brand } from './model.js';

export class BrandController {
  /**
   * @swagger
   * /api/v1/brands:
   *   post:
   *     summary: ایجاد برند جدید
   *     tags: [Brands]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - slug
   *             properties:
   *               name:
   *                 type: string
   *               slug:
   *                 type: string
   *               logo:
   *                 type: string
   *               description:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               website:
   *                 type: string
   *                 format: uri
   *               industry:
   *                 type: string
   *               serviceField:
   *                 type: string
   *               collaborationPeriod:
   *                 type: object
   *               projectsCount:
   *                 type: number
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *               contactInfo:
   *                 type: object
   *               socialLinks:
   *                 type: object
   *               orderIndex:
   *                 type: number
   *               isFeatured:
   *                 type: boolean
   *               isPublic:
   *                 type: boolean
   *               status:
   *                 type: string
   *                 enum: [active, inactive, archived]
   *     responses:
   *       201:
   *         description: برند با موفقیت ایجاد شد
   */
  static async createBrand(req, res, next) {
    try {
      const brand = await BrandService.createBrand(req.body, req.user.id);

      res.status(201).json({
        success: true,
        message: req.t('brands.createSuccess'),
        data: { brand }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/brands:
   *   get:
   *     summary: دریافت لیست برندها
   *     tags: [Brands]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [active, inactive, archived, all]
   *           default: active
   *       - in: query
   *         name: industry
   *         schema:
   *           type: string
   *       - in: query
   *         name: serviceField
   *         schema:
   *           type: string
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *       - in: query
   *         name: tags
   *         schema:
   *           type: array
   *           items:
   *             type: string
   *       - in: query
   *         name: isFeatured
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: isPublic
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           default: orderIndex
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: asc
   *     responses:
   *       200:
   *         description: لیست برندها دریافت شد
   */
  static async getBrands(req, res, next) {
    try {
      const result = await BrandService.getBrands(req.query);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBrandById(req, res, next) {
    try {
      const brand = await Brand.findById(req.params.id);

      if (!brand || brand.deletedAt) {
        return res.status(404).json({
          success: false,
          message: req.t('brands.notFound')
        });
      }

      res.json({
        success: true,
        data: { brand }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/brands/slug/{slug}:
   *   get:
   *     summary: دریافت برند با آدرس یکتا
   *     tags: [Brands]
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: برند دریافت شد
   *       404:
   *         description: برند یافت نشد
   */
  static async getBrandBySlug(req, res, next) {
    try {
      const brand = await BrandService.getBrandBySlug(req.params.slug);

      res.json({
        success: true,
        data: { brand }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateBrand(req, res, next) {
    try {
      const brand = await BrandService.updateBrand(req.params.id, req.body, req.user.id);

      res.json({
        success: true,
        message: req.t('brands.updateSuccess'),
        data: { brand }
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteBrand(req, res, next) {
    try {
      await BrandService.deleteBrand(req.params.id, req.user.id);

      res.json({
        success: true,
        message: req.t('brands.deleteSuccess')
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/brands/featured:
   *   get:
   *     summary: دریافت برندهای ویژه
   *     tags: [Brands]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 12
   *     responses:
   *       200:
   *         description: برندهای ویژه دریافت شدند
   */
  static async getFeaturedBrands(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 12;
      const brands = await BrandService.getFeaturedBrands(limit);

      res.json({
        success: true,
        data: { brands }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/brands/industry/{industry}:
   *   get:
   *     summary: دریافت برندهای یک صنعت
   *     tags: [Brands]
   *     parameters:
   *       - in: path
   *         name: industry
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *     responses:
   *       200:
   *         description: برندهای صنعت دریافت شدند
   */
  static async getBrandsByIndustry(req, res, next) {
    try {
      const { industry } = req.params;
      const limit = parseInt(req.query.limit) || 20;

      const brands = await BrandService.getBrandsByIndustry(industry, limit);

      res.json({
        success: true,
        data: { brands }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/brands/stats:
   *   get:
   *     summary: دریافت آمار برندها
   *     tags: [Brands]
   *     responses:
   *       200:
   *         description: آمار برندها دریافت شد
   */
  static async getBrandStats(req, res, next) {
    try {
      const stats = await BrandService.getBrandStats();

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      next(error);
    }
  }
}
