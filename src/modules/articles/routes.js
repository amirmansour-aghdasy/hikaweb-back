import { Router } from 'express';
import { ArticleController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import { sanitizeHTML } from '../../middleware/validation.js';
import { createArticleSchema, updateArticleSchema, publishArticleSchema } from './validation.js';

const router = Router();

// Public routes
router.get('/', optionalAuth, ArticleController.getArticles);
router.get('/featured', ArticleController.getFeaturedArticles);
router.get('/slug/:slug', optionalAuth, ArticleController.getArticleBySlug);

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

router.post('/:id/like', ArticleController.likeArticle);

export default router;
