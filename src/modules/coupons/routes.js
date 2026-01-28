import { Router } from 'express';
import { CouponController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
  getCouponsQuerySchema
} from './validation.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { csrfProtection } from '../../middleware/security.js';
import { auditLog } from '../../middleware/audit.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Coupons
 *   description: Coupon management endpoints
 */

/**
 * @swagger
 * /api/v1/coupons/validate:
 *   post:
 *     summary: Validate coupon code
 *     tags: [Coupons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *               orderAmount:
 *                 type: number
 *               items:
 *                 type: array
 *     responses:
 *       200:
 *         description: Coupon validated
 *       400:
 *         description: Invalid coupon
 */
router.post(
  '/validate',
  createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 validations per minute
    message: 'تعداد درخواست‌های شما بیش از حد مجاز است.',
    prefix: 'rl:coupon:validate:'
  }),
  validate(validateCouponSchema),
  CouponController.validateCoupon
);

/**
 * @swagger
 * /api/v1/coupons:
 *   post:
 *     summary: Create coupon (admin only)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - type
 *               - value
 *               - validUntil
 *     responses:
 *       201:
 *         description: Coupon created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  '/',
  authenticate,
  authorize(['orders.update']), // Using orders.update permission for coupon management
  csrfProtection,
  createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 coupons per minute
    message: 'تعداد درخواست‌های شما بیش از حد مجاز است.',
    prefix: 'rl:coupon:create:'
  }),
  validate(createCouponSchema),
  auditLog('CREATE_COUPON', 'coupons'),
  CouponController.createCoupon
);

/**
 * @swagger
 * /api/v1/coupons:
 *   get:
 *     summary: Get coupons (admin only)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Coupons retrieved
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  authorize(['orders.read']),
  validate(getCouponsQuerySchema, 'query'),
  CouponController.getCoupons
);

/**
 * @swagger
 * /api/v1/coupons/{id}:
 *   get:
 *     summary: Get coupon by ID (admin only)
 *     tags: [Coupons]
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
 *         description: Coupon retrieved
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/:id',
  authenticate,
  authorize(['orders.read']),
  CouponController.getCouponById
);

/**
 * @swagger
 * /api/v1/coupons/{id}:
 *   put:
 *     summary: Update coupon (admin only)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Coupon updated
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/:id',
  authenticate,
  authorize(['orders.update']),
  csrfProtection,
  validate(updateCouponSchema),
  auditLog('UPDATE_COUPON', 'coupons'),
  CouponController.updateCoupon
);

/**
 * @swagger
 * /api/v1/coupons/{id}:
 *   delete:
 *     summary: Delete coupon (admin only)
 *     tags: [Coupons]
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
 *         description: Coupon deleted
 *       401:
 *         description: Unauthorized
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['orders.delete']),
  csrfProtection,
  auditLog('DELETE_COUPON', 'coupons'),
  CouponController.deleteCoupon
);

export default router;

