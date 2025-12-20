import { ServiceService } from './service.js';
import { Service } from './model.js';
import { logger } from '../../utils/logger.js';
import { handleCreate, handleUpdate, handleDelete, handleGetList } from '../../shared/controllers/baseController.js';

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
    await handleCreate(
      req, res, next,
      ServiceService.createService,
      'service',
      'services.createSuccess'
    );
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
    await handleGetList(req, res, next, ServiceService.getServices);
  }

  /**
   * @swagger
   * /api/v1/services/{id}:
   *   get:
   *     summary: دریافت جزئیات خدمت
   *     tags: [Services]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: جزئیات خدمت دریافت شد
   *       404:
   *         description: خدمت یافت نشد
   */
  static async getServiceById(req, res, next) {
    try {
      const service = await Service.findById(req.params.id)
        .populate('categories', 'name slug')
        .populate('relatedCaseStudies')
        .populate('relatedArticles')
        .populate('mainContent.firstSection.slides', 'title featuredImage slug')
        .populate('mainContent.secondSection.slides', 'title featuredImage slug');

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

  /**
   * @swagger
   * /api/v1/services/slug/{slug}:
   *   get:
   *     summary: دریافت خدمت با آدرس یکتا
   *     tags: [Services]
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: lang
   *         schema:
   *           type: string
   *           enum: [fa, en]
   *           default: fa
   *     responses:
   *       200:
   *         description: خدمت دریافت شد
   *       404:
   *         description: خدمت یافت نشد
   */
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

  /**
   * @swagger
   * /api/v1/services/{id}:
   *   put:
   *     summary: ویرایش خدمت
   *     tags: [Services]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               slug:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               description:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               shortDescription:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               icon:
   *                 type: string
   *               featuredImage:
   *                 type: string
   *               categories:
   *                 type: array
   *                 items:
   *                   type: string
   *               isPopular:
   *                 type: boolean
   *               status:
   *                 type: string
   *                 enum: [active, inactive, archived]
   *     responses:
   *       200:
   *         description: خدمت با موفقیت ویرایش شد
   *       404:
   *         description: خدمت یافت نشد
   */
  static async updateService(req, res, next) {
    await handleUpdate(
      req, res, next,
      ServiceService.updateService,
      'service',
      'services.updateSuccess'
    );
  }

  /**
   * @swagger
   * /api/v1/services/{id}:
   *   delete:
   *     summary: حذف خدمت
   *     tags: [Services]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: خدمت با موفقیت حذف شد
   *       404:
   *         description: خدمت یافت نشد
   */
  static async deleteService(req, res, next) {
    await handleDelete(
      req, res, next,
      ServiceService.deleteService,
      'service',
      'services.deleteSuccess'
    );
  }

  /**
   * @swagger
   * /api/v1/services/popular:
   *   get:
   *     summary: دریافت خدمات محبوب
   *     tags: [Services]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 6
   *     responses:
   *       200:
   *         description: خدمات محبوب دریافت شدند
   */
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
