import { ServiceService } from './service.js';
import { Service } from './model.js';
import { logger } from '../../utils/logger.js';

export class ServiceController {
  /**
   * @swagger
   * /api/v1/services:
   *   post:
   *     summary: ایجاد خدمت جدید
   *     tags: [Services]
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
   *               - description
   *               - categories
   *     responses:
   *       201:
   *         description: خدمت با موفقیت ایجاد شد
   */
  static async createService(req, res, next) {
    try {
      const service = await ServiceService.createService(req.body, req.user.id);

      res.status(201).json({
        success: true,
        message: req.t('services.createSuccess'),
        data: { service }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/services:
   *   get:
   *     summary: دریافت لیست خدمات
   *     tags: [Services]
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
   *         name: search
   *         schema:
   *           type: string
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *       - in: query
   *         name: isPopular
   *         schema:
   *           type: boolean
   *     responses:
   *       200:
   *         description: لیست خدمات دریافت شد
   */
  static async getServices(req, res, next) {
    try {
      const result = await ServiceService.getServices(req.query);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getServiceById(req, res, next) {
    try {
      const service = await Service.findById(req.params.id)
        .populate('categories', 'name slug')
        .populate('relatedCaseStudies')
        .populate('relatedArticles');

      if (!service || service.deletedAt) {
        return res.status(404).json({
          success: false,
          message: req.t('services.notFound')
        });
      }

      res.json({
        success: true,
        data: { service }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getServiceBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const language = req.query.lang || req.language || 'fa';

      const service = await ServiceService.getServiceBySlug(slug, language);

      res.json({
        success: true,
        data: { service }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateService(req, res, next) {
    try {
      const service = await ServiceService.updateService(req.params.id, req.body, req.user.id);

      res.json({
        success: true,
        message: req.t('services.updateSuccess'),
        data: { service }
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteService(req, res, next) {
    try {
      await ServiceService.deleteService(req.params.id, req.user.id);

      res.json({
        success: true,
        message: req.t('services.deleteSuccess')
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPopularServices(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 6;
      const services = await ServiceService.getPopularServices(limit);

      res.json({
        success: true,
        data: { services }
      });
    } catch (error) {
      next(error);
    }
  }
}
