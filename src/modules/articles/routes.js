import { Router } from 'express';
import { ArticleController } from './controller.js';
import { ArticleRatingController } from '../articleRatings/controller.js';
import { BookmarkController } from '../bookmarks/controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import { sanitizeHTML } from '../../middleware/validation.js';
import { createArticleSchema, updateArticleSchema, publishArticleSchema } from './validation.js';
import Joi from 'joi';

const router = Router();

const rateArticleSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'any.required': 'امتیاز الزامی است',
    'number.min': 'امتیاز باید حداقل ۱ باشد',
    'number.max': 'امتیاز نمی‌تواند بیش از ۵ باشد'
  })
});

// Public routes
router.get('/', optionalAuth, ArticleController.getArticles);
router.get('/featured', ArticleController.getFeaturedArticles);
router.get('/popular', ArticleController.getPopularArticles);
router.get('/slug/:slug', optionalAuth, ArticleController.getArticleBySlug);
router.get('/product/:productId', optionalAuth, ArticleController.getArticleByProduct);
router.get('/:id/buyer-count', optionalAuth, ArticleController.getBuyerCount);

// Public rating routes (no auth required)
router.post('/:id/rate', optionalAuth, validate(rateArticleSchema), ArticleRatingController.rateArticle);
router.get('/:id/user-rating', optionalAuth, ArticleRatingController.getUserRating);

// Public like and view routes (no auth required - uses browser fingerprinting)
router.post('/:id/like', optionalAuth, ArticleController.likeArticle);
router.post('/:id/view', optionalAuth, ArticleController.trackView);

// Protected routes
router.use(authenticate);

// Admin routes
router.get('/stats', authorize(['articles.read', 'admin.all']), ArticleController.getArticleStats);

router.post(
  '/',
  authorize(['articles.create']),
  validate(createArticleSchema),
  sanitizeHTML(['content.fa', 'content.en', 'excerpt.fa', 'excerpt.en']),
  auditLog('CREATE_ARTICLE', 'articles'),
  ArticleController.createArticle
);

router.get('/:id', authorize(['articles.read']), ArticleController.getArticleById);

router.put(
  '/:id',
  authorize(['articles.update']),
  validate(updateArticleSchema),
  sanitizeHTML(['content.fa', 'content.en', 'excerpt.fa', 'excerpt.en']),
  auditLog('UPDATE_ARTICLE', 'articles'),
  ArticleController.updateArticle
);

router.patch(
  '/:id/publish',
  authorize(['articles.update']),
  validate(publishArticleSchema),
  auditLog('PUBLISH_ARTICLE', 'articles'),
  ArticleController.togglePublish
);

router.delete(
  '/:id',
  authorize(['articles.delete']),
  auditLog('DELETE_ARTICLE', 'articles'),
  ArticleController.deleteArticle
);

// Bookmark routes (require auth)
router.post('/:id/bookmark', authenticate, auditLog('TOGGLE_BOOKMARK', 'bookmarks'), BookmarkController.toggleBookmark);
router.get('/:id/bookmark/check', authenticate, BookmarkController.checkBookmark);

// Download routes (require auth and purchase)
router.get('/:id/download-zip', authenticate, ArticleController.downloadArticleZip);

export default router;
