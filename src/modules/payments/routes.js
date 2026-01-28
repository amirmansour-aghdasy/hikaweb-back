import { Router } from 'express';
import { PaymentController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import {
  initializePaymentSchema,
  refundPaymentSchema,
  getPaymentsQuerySchema
} from './validation.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { csrfProtection } from '../../middleware/security.js';
import { auditLog } from '../../middleware/audit.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment management endpoints
 */

/**
 * @swagger
 * /api/v1/payments:
 *   post:
 *     summary: Initialize payment for order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *               gateway:
 *                 type: string
 *                 enum: [zarinpal, idpay, saman]
 *     responses:
 *       200:
 *         description: Payment initialized successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  authenticate,
  csrfProtection,
  createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 payment initializations per minute
    message: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی صبر کنید.',
    prefix: 'rl:payment:init:'
  }),
  validate(initializePaymentSchema),
  auditLog('INITIALIZE_PAYMENT', 'payments'),
  PaymentController.initializePayment
);

/**
 * @swagger
 * /api/v1/payments/verify/{gateway}:
 *   post:
 *     summary: Verify payment (gateway callback)
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: gateway
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirect to success/failure page
 */
router.post(
  '/verify/:gateway',
  PaymentController.verifyPayment
);

/**
 * @swagger
 * /api/v1/payments/me:
 *   get:
 *     summary: Get user payments
 *     tags: [Payments]
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User payments retrieved
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/me',
  authenticate,
  validate(getPaymentsQuerySchema, 'query'),
  PaymentController.getUserPayments
);

/**
 * @swagger
 * /api/v1/payments/order/{orderId}:
 *   get:
 *     summary: Get payment by order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment retrieved
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/order/:orderId',
  authenticate,
  PaymentController.getPaymentByOrder
);

/**
 * @swagger
 * /api/v1/payments/{id}:
 *   get:
 *     summary: Get payment by ID
 *     tags: [Payments]
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
 *         description: Payment retrieved
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/:id',
  authenticate,
  PaymentController.getPaymentById
);

/**
 * @swagger
 * /api/v1/payments/{id}/refund:
 *   post:
 *     summary: Refund payment (admin only)
 *     tags: [Payments]
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
 *             properties:
 *               reason:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Payment refunded
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  '/:id/refund',
  authenticate,
  authorize(['orders.update']),
  csrfProtection,
  validate(refundPaymentSchema),
  auditLog('REFUND_PAYMENT', 'payments'),
  PaymentController.refundPayment
);

export default router;

