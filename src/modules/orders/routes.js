import { Router } from 'express';
import { OrderController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  getOrdersQuerySchema
} from './validation.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { csrfProtection } from '../../middleware/security.js';
import { auditLog } from '../../middleware/audit.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management endpoints
 */

/**
 * @swagger
 * /api/v1/orders:
 *   post:
 *     summary: Create order from cart
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contactInfo
 *               - paymentMethod
 *             properties:
 *               contactInfo:
 *                 type: object
 *                 required:
 *                   - fullName
 *                   - phoneNumber
 *                   - email
 *               shipping:
 *                 type: object
 *               paymentMethod:
 *                 type: string
 *                 enum: [online, cash, points]
 *     responses:
 *       201:
 *         description: Order created successfully
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
    max: 5, // 5 orders per minute
    message: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی صبر کنید.',
    prefix: 'rl:order:create:'
  }),
  validate(createOrderSchema),
  auditLog('CREATE_ORDER', 'orders'),
  OrderController.createOrder
);

/**
 * @swagger
 * /api/v1/orders/me:
 *   get:
 *     summary: Get user orders
 *     tags: [Orders]
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
 *         description: User orders retrieved
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/me',
  authenticate,
  validate(getOrdersQuerySchema, 'query'),
  OrderController.getUserOrders
);

/**
 * @swagger
 * /api/v1/orders/purchased-products:
 *   get:
 *     summary: Get purchased product IDs (for digital article products)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Purchased product IDs retrieved
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/purchased-products',
  authenticate,
  OrderController.getPurchasedProducts
);

/**
 * @swagger
 * /api/v1/orders:
 *   get:
 *     summary: Get orders (admin only)
 *     tags: [Orders]
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
 *         description: Orders retrieved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/',
  authenticate,
  authorize(['orders.read']),
  validate(getOrdersQuerySchema, 'query'),
  OrderController.getOrders
);

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
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
 *         description: Order retrieved
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
router.get(
  '/:id',
  authenticate,
  OrderController.getOrderById
);

/**
 * @swagger
 * /api/v1/orders/{id}/status:
 *   put:
 *     summary: Update order status (admin only)
 *     tags: [Orders]
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processing, shipped, delivered, cancelled, refunded]
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order status updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.put(
  '/:id/status',
  authenticate,
  authorize(['orders.update']),
  csrfProtection,
  createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 updates per minute
    message: 'تعداد درخواست‌های شما بیش از حد مجاز است.',
    prefix: 'rl:order:update:'
  }),
  validate(updateOrderStatusSchema),
  auditLog('UPDATE_ORDER_STATUS', 'orders'),
  OrderController.updateOrderStatus
);

/**
 * @swagger
 * /api/v1/orders/{id}/cancel:
 *   post:
 *     summary: Cancel order
 *     tags: [Orders]
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
 *     responses:
 *       200:
 *         description: Order cancelled
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/:id/cancel',
  authenticate,
  csrfProtection,
  validate(cancelOrderSchema),
  auditLog('CANCEL_ORDER', 'orders'),
  OrderController.cancelOrder
);

/**
 * @swagger
 * /api/v1/orders/{id}/payment:
 *   post:
 *     summary: Mark order as paid (for payment gateway callbacks)
 *     tags: [Orders]
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
 *               - transactionId
 *               - gateway
 *             properties:
 *               transactionId:
 *                 type: string
 *               gateway:
 *                 type: string
 *               gatewayResponse:
 *                 type: object
 *     responses:
 *       200:
 *         description: Order marked as paid
 */
router.post(
  '/:id/payment',
  authenticate,
  csrfProtection,
  OrderController.markOrderAsPaid
);

/**
 * @swagger
 * /api/v1/orders/{id}/items/{itemId}/download:
 *   get:
 *     summary: Download digital product from order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Download URL retrieved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.get(
  '/:id/items/:itemId/download',
  authenticate,
  OrderController.downloadDigitalProduct
);

/**
 * @swagger
 * /api/v1/orders/{id}/invoice:
 *   get:
 *     summary: Download invoice PDF for order
 *     tags: [Orders]
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
 *         description: Invoice PDF downloaded
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.get(
  '/:id/invoice',
  authenticate,
  OrderController.downloadInvoice
);

export default router;

