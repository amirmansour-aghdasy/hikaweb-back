import { Router } from 'express';
import { ProductLikeController } from './controller.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { csrfProtection } from '../../middleware/security.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';

// Rate limiter for likes
const likeLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 likes per 15 minutes
  message: 'تعداد لایک‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید.',
  prefix: 'rl:like:'
});

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Product Likes
 *   description: Product like management endpoints
 */

/**
 * @swagger
 * /api/v1/products/{id}/like:
 *   get:
 *     summary: Check if product is liked
 *     tags: [Product Likes]
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
 *         description: Like status retrieved
 */
router.get('/:id/like', optionalAuth, ProductLikeController.checkLike);

/**
 * @swagger
 * /api/v1/products/{id}/like:
 *   post:
 *     summary: Toggle product like
 *     tags: [Product Likes]
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
 *         description: Like toggled successfully
 */
router.post('/:id/like', authenticate, csrfProtection, likeLimiter, ProductLikeController.toggleLike);

/**
 * @swagger
 * /api/v1/products/{id}/likes/count:
 *   get:
 *     summary: Get product like count (public endpoint - no auth required)
 *     tags: [Product Likes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Like count retrieved
 */
// Public route - no authentication required
router.get('/:id/likes/count', ProductLikeController.getLikeCount);

/**
 * @swagger
 * /api/v1/products/likes:
 *   get:
 *     summary: Get user liked products
 *     tags: [Product Likes]
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
 *         description: Likes retrieved successfully
 */
router.get('/likes', authenticate, ProductLikeController.getUserLikes);

export default router;

