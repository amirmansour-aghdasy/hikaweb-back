import { PortfolioService } from './service.js';
import { Portfolio } from './model.js';
import { logger } from '../../utils/logger.js';
import { handleCreate, handleUpdate, handleDelete, handleGetList } from '../../shared/controllers/baseController.js';

export class PortfolioController {
  /**
   * @swagger
   * /api/v1/portfolio:
   *   post:
   *     summary: ایجاد نمونه کار جدید
   *     tags: [Portfolio]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - slug
   *               - description
   *               - client
   *               - project
   *               - services
   *               - featuredImage
   *     responses:
   *       201:
   *         description: نمونه کار با موفقیت ایجاد شد
   */
  static async createPortfolio(req, res, next) {
    await handleCreate(
      req, res, next,
      PortfolioService.createPortfolio,
      'portfolio',
      'portfolio.createSuccess'
    );
  }

  /**
   * @swagger
   * /api/v1/portfolio:
   *   get:
   *     summary: دریافت لیست نمونه کارها
   *     tags: [Portfolio]
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
   *         name: service
   *         schema:
   *           type: string
   *       - in: query
   *         name: isFeatured
   *         schema:
   *           type: boolean
   *     responses:
   *       200:
   *         description: لیست نمونه کارها دریافت شد
   */
  static async getPortfolios(req, res, next) {
    await handleGetList(req, res, next, PortfolioService.getPortfolios);
  }

  /**
   * @swagger
   * /api/v1/portfolio/{id}:
   *   get:
   *     summary: دریافت جزئیات نمونه کار
   *     tags: [Portfolio]
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
   *         description: جزئیات نمونه کار دریافت شد
   *       404:
   *         description: نمونه کار یافت نشد
   */
  static async getPortfolioById(req, res, next) {
    try {
      const portfolio = await Portfolio.findById(req.params.id)
        .populate('services', 'name slug')
        .populate('categories', 'name slug');

      if (!portfolio || portfolio.deletedAt) {
        return res.status(404).json({
          success: false,
          message: req.t('portfolio.notFound')
        });
      }

      res.json({
        success: true,
        data: { portfolio }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/portfolio/slug/{slug}:
   *   get:
   *     summary: دریافت نمونه کار با آدرس یکتا
   *     tags: [Portfolio]
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
   *         description: نمونه کار دریافت شد
   *       404:
   *         description: نمونه کار یافت نشد
   */
  static async getPortfolioBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const language = req.query.lang || req.language || 'fa';

      const portfolio = await PortfolioService.getPortfolioBySlug(slug, language);

      // Get related portfolios
      const relatedPortfolios = await PortfolioService.getRelatedPortfolios(portfolio._id);

      res.json({
        success: true,
        data: {
          portfolio,
          relatedPortfolios
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/portfolio/{id}:
   *   put:
   *     summary: ویرایش نمونه کار
   *     tags: [Portfolio]
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
   *               title:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               slug:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               description:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               featuredImage:
   *                 type: string
   *               client:
   *                 type: object
   *               services:
   *                 type: array
   *                 items:
   *                   type: string
   *               status:
   *                 type: string
   *                 enum: [active, inactive, archived]
   *     responses:
   *       200:
   *         description: نمونه کار با موفقیت ویرایش شد
   *       404:
   *         description: نمونه کار یافت نشد
   */
  static async updatePortfolio(req, res, next) {
    await handleUpdate(
      req, res, next,
      PortfolioService.updatePortfolio,
      'portfolio',
      'portfolio.updateSuccess'
    );
  }

  /**
   * @swagger
   * /api/v1/portfolio/{id}:
   *   delete:
   *     summary: حذف نمونه کار
   *     tags: [Portfolio]
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
   *         description: نمونه کار با موفقیت حذف شد
   *       404:
   *         description: نمونه کار یافت نشد
   */
  static async deletePortfolio(req, res, next) {
    await handleDelete(
      req, res, next,
      PortfolioService.deletePortfolio,
      'portfolio',
      'portfolio.deleteSuccess'
    );
  }

  /**
   * @swagger
   * /api/v1/portfolio/featured:
   *   get:
   *     summary: دریافت نمونه کارهای ویژه
   *     tags: [Portfolio]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 6
   *     responses:
   *       200:
   *         description: نمونه کارهای ویژه دریافت شدند
   */
  static async getFeaturedPortfolios(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 6;
      const portfolios = await PortfolioService.getFeaturedPortfolios(limit);

      res.json({
        success: true,
        data: { portfolios }
      });
    } catch (error) {
      next(error);
    }
  }
}
