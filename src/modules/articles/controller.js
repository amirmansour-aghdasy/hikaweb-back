import { ArticleService } from './service.js';
import { Article } from './model.js';
import { logger } from '../../utils/logger.js';

export class ArticleController {
  /**
   * @swagger
   * /api/v1/articles:
   *   post:
   *     summary: ایجاد مقاله جدید
   *     tags: [Articles]
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
   *               - content
   *               - categories
   *             properties:
   *               title:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               slug:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               excerpt:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               content:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               featuredImage:
   *                 type: string
   *               categories:
   *                 type: array
   *                 items:
   *                   type: string
   *               tags:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               isPublished:
   *                 type: boolean
   *                 default: false
   *               isFeatured:
   *                 type: boolean
   *                 default: false
   *     responses:
   *       201:
   *         description: مقاله با موفقیت ایجاد شد
   *       400:
   *         description: خطای اعتبارسنجی
   *       409:
   *         description: آدرس یکتا تکراری
   */
  static async createArticle(req, res, next) {
    try {
      const article = await ArticleService.createArticle(req.body, req.user.id);

      res.status(201).json({
        success: true,
        message: req.t('articles.createSuccess'),
        data: { article }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/articles:
   *   get:
   *     summary: دریافت لیست مقالات
   *     tags: [Articles]
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
   *         name: author
   *         schema:
   *           type: string
   *       - in: query
   *         name: isPublished
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: isFeatured
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: language
   *         schema:
   *           type: string
   *           enum: [fa, en]
   *           default: fa
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [createdAt, publishedAt, views, likes, title]
   *           default: createdAt
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *     responses:
   *       200:
   *         description: لیست مقالات دریافت شد
   */
  static async getArticles(req, res, next) {
    try {
      const result = await ArticleService.getArticles(req.query);

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
   * /api/v1/articles/{id}:
   *   get:
   *     summary: دریافت مقاله با شناسه
   *     tags: [Articles]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: مقاله دریافت شد
   *       404:
   *         description: مقاله یافت نشد
   */
  static async getArticleById(req, res, next) {
    try {
      const article = await Article.findById(req.params.id)
        .populate('author', 'name email avatar')
        .populate('categories', 'name slug');

      if (!article || article.deletedAt) {
        return res.status(404).json({
          success: false,
          message: req.t('articles.notFound')
        });
      }

      res.json({
        success: true,
        data: { article }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/articles/slug/{slug}:
   *   get:
   *     summary: دریافت مقاله با آدرس یکتا
   *     tags: [Articles]
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
   *         description: مقاله دریافت شد
   *       404:
   *         description: مقاله یافت نشد
   */
  static async getArticleBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const language = req.query.lang || req.language || 'fa';

      const article = await ArticleService.getArticleBySlug(slug, language);

      // Get related articles
      const relatedArticles = await ArticleService.getRelatedArticles(article._id);

      res.json({
        success: true,
        data: {
          article,
          relatedArticles
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/articles/{id}:
   *   put:
   *     summary: به‌روزرسانی مقاله
   *     tags: [Articles]
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
   *               excerpt:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               content:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               featuredImage:
   *                 type: string
   *               categories:
   *                 type: array
   *                 items:
   *                   type: string
   *               tags:
   *                 type: object
   *               isPublished:
   *                 type: boolean
   *               isFeatured:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: مقاله با موفقیت به‌روزرسانی شد
   *       404:
   *         description: مقاله یافت نشد
   */
  static async updateArticle(req, res, next) {
    try {
      const article = await ArticleService.updateArticle(req.params.id, req.body, req.user.id);

      res.json({
        success: true,
        message: req.t('articles.updateSuccess'),
        data: { article }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/articles/{id}:
   *   delete:
   *     summary: حذف مقاله
   *     tags: [Articles]
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
   *         description: مقاله با موفقیت حذف شد
   *       404:
   *         description: مقاله یافت نشد
   */
  static async deleteArticle(req, res, next) {
    try {
      await ArticleService.deleteArticle(req.params.id, req.user.id);

      res.json({
        success: true,
        message: req.t('articles.deleteSuccess')
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/articles/{id}/publish:
   *   patch:
   *     summary: انتشار/لغو انتشار مقاله
   *     tags: [Articles]
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
   *             required:
   *               - isPublished
   *             properties:
   *               isPublished:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: وضعیت انتشار مقاله تغییر کرد
   *       404:
   *         description: مقاله یافت نشد
   */
  static async togglePublish(req, res, next) {
    try {
      const { isPublished } = req.body;

      const article = await ArticleService.updateArticle(
        req.params.id,
        { isPublished },
        req.user.id
      );

      const message = isPublished
        ? req.t('articles.publishSuccess')
        : req.t('articles.unpublishSuccess');

      res.json({
        success: true,
        message,
        data: { article }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/articles/featured:
   *   get:
   *     summary: دریافت مقالات ویژه
   *     tags: [Articles]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 6
   *     responses:
   *       200:
   *         description: مقالات ویژه دریافت شدند
   */
  static async getFeaturedArticles(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 6;
      const articles = await ArticleService.getFeaturedArticles(limit);

      res.json({
        success: true,
        data: { articles }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/articles/stats:
   *   get:
   *     summary: دریافت آمار مقالات
   *     tags: [Articles]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: آمار مقالات دریافت شد
   */
  static async getArticleStats(req, res, next) {
    try {
      const stats = await ArticleService.getArticleStats();

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/articles/{id}/like:
   *   post:
   *     summary: لایک مقاله
   *     tags: [Articles]
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
   *         description: مقاله لایک شد
   *       404:
   *         description: مقاله یافت نشد
   */
  static async likeArticle(req, res, next) {
    try {
      const article = await Article.findById(req.params.id);

      if (!article || article.deletedAt) {
        return res.status(404).json({
          success: false,
          message: req.t('articles.notFound')
        });
      }

      article.likes += 1;
      await article.save();

      res.json({
        success: true,
        message: 'مقاله لایک شد',
        data: { likes: article.likes }
      });
    } catch (error) {
      next(error);
    }
  }
}
