import { Router } from 'express';
import { ShippingController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate } from '../../middleware/auth.js';
import {
  createAddressSchema,
  updateAddressSchema,
  calculateShippingCostSchema
} from './validation.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { csrfProtection } from '../../middleware/security.js';
import { auditLog } from '../../middleware/audit.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Shipping
 *   description: Shipping management endpoints
 */

/**
 * @swagger
 * /api/v1/shipping/addresses:
 *   post:
 *     summary: Create shipping address
 *     tags: [Shipping]
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
 *               - address
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [home, work, other]
 *               label:
 *                 type: string
 *               contactInfo:
 *                 type: object
 *               address:
 *                 type: object
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Address created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/addresses',
  authenticate,
  csrfProtection,
  createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 addresses per minute
    message: 'تعداد درخواست‌های شما بیش از حد مجاز است.',
    prefix: 'rl:shipping:address:'
  }),
  validate(createAddressSchema),
  auditLog('CREATE_SHIPPING_ADDRESS', 'shipping'),
  ShippingController.createAddress
);

/**
 * @swagger
 * /api/v1/shipping/addresses:
 *   get:
 *     summary: Get user addresses
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User addresses retrieved
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/addresses',
  authenticate,
  ShippingController.getUserAddresses
);

/**
 * @swagger
 * /api/v1/shipping/addresses/{id}:
 *   get:
 *     summary: Get address by ID
 *     tags: [Shipping]
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
 *         description: Address retrieved
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/addresses/:id',
  authenticate,
  ShippingController.getAddressById
);

/**
 * @swagger
 * /api/v1/shipping/addresses/{id}:
 *   put:
 *     summary: Update shipping address
 *     tags: [Shipping]
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
 *         description: Address updated
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/addresses/:id',
  authenticate,
  csrfProtection,
  validate(updateAddressSchema),
  auditLog('UPDATE_SHIPPING_ADDRESS', 'shipping'),
  ShippingController.updateAddress
);

/**
 * @swagger
 * /api/v1/shipping/addresses/{id}:
 *   delete:
 *     summary: Delete shipping address
 *     tags: [Shipping]
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
 *         description: Address deleted
 *       401:
 *         description: Unauthorized
 */
router.delete(
  '/addresses/:id',
  authenticate,
  csrfProtection,
  auditLog('DELETE_SHIPPING_ADDRESS', 'shipping'),
  ShippingController.deleteAddress
);

/**
 * @swagger
 * /api/v1/shipping/addresses/{id}/default:
 *   post:
 *     summary: Set address as default
 *     tags: [Shipping]
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
 *         description: Default address set
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/addresses/:id/default',
  authenticate,
  csrfProtection,
  auditLog('SET_DEFAULT_ADDRESS', 'shipping'),
  ShippingController.setDefaultAddress
);

/**
 * @swagger
 * /api/v1/shipping/calculate:
 *   post:
 *     summary: Calculate shipping cost
 *     tags: [Shipping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - method
 *             properties:
 *               method:
 *                 type: string
 *                 enum: [standard, express, pickup]
 *               items:
 *                 type: array
 *               orderTotal:
 *                 type: number
 *               destination:
 *                 type: object
 *     responses:
 *       200:
 *         description: Shipping cost calculated
 */
router.post(
  '/calculate',
  validate(calculateShippingCostSchema),
  ShippingController.calculateShippingCost
);

/**
 * @swagger
 * /api/v1/shipping/methods:
 *   get:
 *     summary: Get available shipping methods
 *     tags: [Shipping]
 *     responses:
 *       200:
 *         description: Available methods retrieved
 */
router.get(
  '/methods',
  ShippingController.getAvailableMethods
);

export default router;

