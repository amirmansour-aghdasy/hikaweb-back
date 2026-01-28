import { Router } from 'express';
import { ProductBookmarkController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { csrfProtection } from '../../middleware/security.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';

// Rate limiter for bookmarks
const bookmarkLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 bookmarks per 15 minutes
  message: 'تعداد بوکمارک‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید.',
  prefix: 'rl:bookmark:'
});

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Product Bookmarks
 *   description: Product bookmark management endpoints
 */

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/products/bookmarks:
 *   get:
 *     summary: Get user product bookmarks
 *     tags: [Product Bookmarks]
 *     security:
 *       - bearerAuth: []
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
 *           default: 25
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bookmarks retrieved successfully
 */
router.get('/', ProductBookmarkController.getUserBookmarks);

/**
 * @swagger
 * /api/v1/products/{id}/bookmark:
 *   post:
 *     summary: Toggle product bookmark
 *     tags: [Product Bookmarks]
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
 *         description: Bookmark toggled successfully
 */
router.post('/:id/bookmark', csrfProtection, bookmarkLimiter, ProductBookmarkController.toggleBookmark);

/**
 * @swagger
 * /api/v1/products/{id}/bookmark:
 *   get:
 *     summary: Check if product is bookmarked
 *     tags: [Product Bookmarks]
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
 *         description: Bookmark status retrieved
 */
router.get('/:id/bookmark', ProductBookmarkController.checkBookmark);

export default router;

