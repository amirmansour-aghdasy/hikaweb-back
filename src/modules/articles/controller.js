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

      // Get related content in parallel
      const [relatedArticles, relatedVideos, relatedPortfolios] = await Promise.all([
        ArticleService.getRelatedArticles(article._id, 5),
        ArticleService.getRelatedVideos(article._id, 4),
        ArticleService.getRelatedPortfolios(article._id, 4)
      ]);

      // Get user rating if available
      let userRating = null;
      if (req.userIdentifier) {
        const { ArticleRatingService } = await import('../articleRatings/service.js');
        userRating = await ArticleRatingService.getUserRating(article._id, req.userIdentifier);
      }

      // Get bookmark status if user is authenticated
      let isBookmarked = false;
      if (req.user?.id) {
        const { BookmarkService } = await import('../bookmarks/service.js');
        isBookmarked = await BookmarkService.isBookmarked(article._id, req.user.id);
      }

      res.json({
        success: true,
        data: {
          article: {
            ...article.toObject(),
            userRating,
            isBookmarked
          },
          relatedArticles,
          relatedVideos,
          relatedPortfolios
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

  static async getPopularArticles(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const articles = await ArticleService.getPopularArticles(limit);

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

      // Get user identifier (user ID if logged in, or IP address)
      const userId = req.user?.id || null;
      const userIdentifier = userId || req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'anonymous';

      // Import ArticleLike model
      const { ArticleLike } = await import('./articleLikeModel.js');

      // Check if user already liked this article
      const existingLike = await ArticleLike.findOne({
        article: article._id,
        $or: [
          userId ? { user: userId } : {},
          { userIdentifier: userIdentifier }
        ]
      });

      let isLiked = false;
      let newLikesCount = article.likes;

      if (existingLike) {
        // User already liked - remove the like (unlike)
        await ArticleLike.deleteOne({ _id: existingLike._id });
        newLikesCount = Math.max(0, article.likes - 1);
        isLiked = false;
      } else {
        // User hasn't liked - add the like
        await ArticleLike.create({
          article: article._id,
          user: userId,
          userIdentifier: userIdentifier
        });
        newLikesCount = article.likes + 1;
        isLiked = true;
      }

      // Update article likes count
      article.likes = newLikesCount;
      await article.save();

      res.json({
        success: true,
        message: isLiked ? 'مقاله لایک شد' : 'لایک شما برداشته شد',
        data: { 
          likes: newLikesCount,
          isLiked: isLiked
        }
      });
    } catch (error) {
      // Handle duplicate key error (race condition)
      if (error.code === 11000) {
        // Like already exists or was just created - fetch current state
        const { ArticleLike } = await import('./articleLikeModel.js');
        const userId = req.user?.id || null;
        const userIdentifier = userId || req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'anonymous';
        
        const existingLike = await ArticleLike.findOne({
          article: req.params.id,
          $or: [
            userId ? { user: userId } : {},
            { userIdentifier: userIdentifier }
          ]
        });

        const article = await Article.findById(req.params.id);
        
        return res.json({
          success: true,
          message: existingLike ? 'مقاله لایک شد' : 'لایک شما برداشته شد',
          data: { 
            likes: article.likes,
            isLiked: !!existingLike
          }
        });
      }
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/articles/{id}/view:
   *   post:
   *     summary: ثبت بازدید منحصر به فرد مقاله
   *     tags: [Articles]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: بازدید ثبت شد
   *       404:
   *         description: مقاله یافت نشد
   */
  static async trackView(req, res, next) {
    try {
      const { id } = req.params;
      const userIdentifier = ArticleService.generateUserIdentifier(req);
      const userId = req.user?.id || null;
      const ip = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || null;
      const userAgent = req.headers['user-agent'] || null;

      const result = await ArticleService.trackView(id, userIdentifier, userId, ip, userAgent);

      res.json({
        success: true,
        message: result.isNewView ? 'بازدید ثبت شد' : 'بازدید قبلاً ثبت شده است',
        data: {
          isNewView: result.isNewView,
          views: result.views
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
