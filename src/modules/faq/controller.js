import { FAQService } from './service.js';
import { FAQ } from './model.js';

export class FAQController {
  /**
   * @swagger
   * /api/v1/faq:
   *   post:
   *     summary: ایجاد سوال متداول جدید
   *     tags: [FAQ]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - question
   *               - answer
   *             properties:
   *               question:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               answer:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               serviceId:
   *                 type: string
   *               categoryIds:
   *                 type: array
   *                 items:
   *                   type: string
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *               orderIndex:
   *                 type: number
   *               isPublic:
   *                 type: boolean
   *               status:
   *                 type: string
   *                 enum: [active, inactive, archived]
   *     responses:
   *       201:
   *         description: سوال متداول با موفقیت ایجاد شد
   */
  static async createFAQ(req, res, next) {
    try {
      const faq = await FAQService.createFAQ(req.body, req.user.id);

      res.status(201).json({
        success: true,
        message: req.t('faq.createSuccess'),
        data: { faq }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/faq:
   *   get:
   *     summary: دریافت لیست سوالات متداول
   *     tags: [FAQ]
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
   *         name: serviceId
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
   *         description: لیست سوالات متداول دریافت شد
   */
  static async getFAQs(req, res, next) {
    try {
      const result = await FAQService.getFAQs(req.query);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/faq/{id}:
   *   get:
   *     summary: دریافت جزئیات سوال متداول
   *     tags: [FAQ]
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
   *         description: جزئیات سوال متداول دریافت شد
   *       404:
   *         description: سوال متداول یافت نشد
   */
  static async getFAQById(req, res, next) {
    try {
      const faq = await FAQ.findById(req.params.id)
        .populate('service', 'name slug')
        .populate('category', 'name slug');

      if (!faq || faq.deletedAt) {
        return res.status(404).json({
          success: false,
          message: req.t('faq.notFound')
        });
      }

      res.json({
        success: true,
        data: { faq }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/faq/service/{serviceId}:
   *   get:
   *     summary: دریافت سوالات متداول یک سرویس
   *     tags: [FAQ]
   *     parameters:
   *       - in: path
   *         name: serviceId
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
   *         description: سوالات متداول سرویس دریافت شد
   */
  static async getFAQsByService(req, res, next) {
    try {
      const { serviceId } = req.params;
      const limit = parseInt(req.query.limit) || 20;

      const faqs = await FAQService.getFAQsByService(serviceId, limit);

      res.json({
        success: true,
        data: { faqs }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/faq/{id}:
   *   put:
   *     summary: ویرایش سوال متداول
   *     tags: [FAQ]
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
   *               question:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               answer:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               serviceId:
   *                 type: string
   *               orderIndex:
   *                 type: number
   *               isPublic:
   *                 type: boolean
   *               status:
   *                 type: string
   *                 enum: [active, inactive, archived]
   *     responses:
   *       200:
   *         description: سوال متداول با موفقیت ویرایش شد
   *       404:
   *         description: سوال متداول یافت نشد
   */
  static async updateFAQ(req, res, next) {
    try {
      const faq = await FAQService.updateFAQ(req.params.id, req.body, req.user.id);

      res.json({
        success: true,
        message: req.t('faq.updateSuccess'),
        data: { faq }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/faq/{id}:
   *   delete:
   *     summary: حذف سوال متداول
   *     tags: [FAQ]
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
   *         description: سوال متداول با موفقیت حذف شد
   *       404:
   *         description: سوال متداول یافت نشد
   */
  static async deleteFAQ(req, res, next) {
    try {
      await FAQService.deleteFAQ(req.params.id, req.user.id);

      res.json({
        success: true,
        message: req.t('faq.deleteSuccess')
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/faq/public:
   *   get:
   *     summary: دریافت سوالات متداول عمومی
   *     tags: [FAQ]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *     responses:
   *       200:
   *         description: سوالات متداول عمومی دریافت شدند
   */
  static async getPublicFAQs(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const faqs = await FAQService.getPublicFAQs(limit);

      res.json({
        success: true,
        data: { faqs }
      });
    } catch (error) {
      next(error);
    }
  }
}
