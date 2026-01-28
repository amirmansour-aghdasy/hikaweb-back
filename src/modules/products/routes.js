import { Router } from 'express';
import { ProductController } from './controller.js';
import { validate, sanitizeHTML } from '../../middleware/validation.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import { csrfProtection } from '../../middleware/security.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { createProductSchema, updateProductSchema, subscribeToNotificationsSchema } from './validation.js';

// Rate limiter for notifications
const notificationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 subscription actions per 15 minutes
  message: 'تعداد درخواست‌های اشتراک بیش از حد مجاز است. لطفاً کمی صبر کنید.',
  prefix: 'rl:notification:'
});

// Rate limiter for product operations (create, update, delete)
const productOperationLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 operations per minute
  message: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی صبر کنید.',
  prefix: 'rl:product:operation:'
});
import productBookmarkRoutes from '../productBookmarks/routes.js';
import productLikeRoutes from '../productLikes/routes.js';
import productQuestionRoutes from '../productQuestions/routes.js';
import { ProductQuestionController } from '../productQuestions/controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management endpoints
 */

// Public routes
router.get('/', optionalAuth, ProductController.getProducts);
router.get('/sale', optionalAuth, ProductController.getProductsOnSale);
router.get('/slug/:slug', optionalAuth, ProductController.getProductBySlug);

// Mount public like routes BEFORE :id route (for likes/count endpoint)
// This ensures /products/:id/likes/count matches before /products/:id
router.use('/', productLikeRoutes);

// Product detail route (must be after likes routes)
router.get('/:id', optionalAuth, ProductController.getProductById);

// Mount public question routes BEFORE authenticate (for GET /:id/questions)
// This ensures public access to viewing questions
router.get('/:id/questions', optionalAuth, ProductQuestionController.getProductQuestions);

// Protected routes
router.use(authenticate);

// Notification subscriptions (authenticated users)
router.get(
  '/:id/notifications/status',
  ProductController.checkSubscriptionStatus
);
router.post(
  '/:id/notifications/subscribe',
  csrfProtection,
  notificationLimiter,
  validate(subscribeToNotificationsSchema),
  ProductController.subscribeToNotifications
);
router.post(
  '/:id/notifications/unsubscribe',
  csrfProtection,
  notificationLimiter,
  ProductController.unsubscribeFromNotifications
);

// Admin routes
router.post(
  '/',
  authorize(['products.create']),
  csrfProtection,
  productOperationLimiter,
  validate(createProductSchema),
  sanitizeHTML(['description.fa', 'description.en', 'shortDescription.fa', 'shortDescription.en', 'fullDescription.fa', 'fullDescription.en']),
  auditLog('CREATE_PRODUCT', 'products'),
  ProductController.createProduct
);

router.put(
  '/:id',
  authorize(['products.update']),
  csrfProtection,
  productOperationLimiter,
  validate(updateProductSchema),
  sanitizeHTML(['description.fa', 'description.en', 'shortDescription.fa', 'shortDescription.en', 'fullDescription.fa', 'fullDescription.en']),
  auditLog('UPDATE_PRODUCT', 'products'),
  ProductController.updateProduct
);

router.delete(
  '/:id',
  authorize(['products.delete']),
  csrfProtection,
  productOperationLimiter,
  auditLog('DELETE_PRODUCT', 'products'),
  ProductController.deleteProduct
);

// Mount bookmark and question routes (these require auth)
router.use('/', productBookmarkRoutes);
router.use('/', productQuestionRoutes);

export default router;

