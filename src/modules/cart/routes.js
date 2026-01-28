import { Router } from 'express';
import { CartController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import {
  addItemSchema,
  updateItemQuantitySchema,
  applyCouponSchema
} from './validation.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Cart management endpoints
 */

/**
 * @swagger
 * /api/v1/cart:
 *   get:
 *     summary: Get user cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, CartController.getUserCart);

/**
 * @swagger
 * /api/v1/cart/guest:
 *   get:
 *     summary: Get or create guest cart
 *     tags: [Cart]
 *     responses:
 *       200:
 *         description: Guest cart retrieved/created
 */
router.get('/guest', CartController.getGuestCart);

/**
 * @swagger
 * /api/v1/cart/items:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: number
 *                 default: 1
 *     responses:
 *       200:
 *         description: Item added to cart
 */
router.post(
  '/items',
  optionalAuth,
  validate(addItemSchema),
  CartController.addItem
);

/**
 * @swagger
 * /api/v1/cart/items/{productId}:
 *   put:
 *     summary: Update item quantity
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
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
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Item quantity updated
 */
router.put(
  '/items/:productId',
  optionalAuth,
  validate(updateItemQuantitySchema),
  CartController.updateItemQuantity
);

/**
 * @swagger
 * /api/v1/cart/items/{productId}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item removed from cart
 */
router.delete('/items/:productId', optionalAuth, CartController.removeItem);

/**
 * @swagger
 * /api/v1/cart:
 *   delete:
 *     summary: Clear cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared
 */
router.delete('/', optionalAuth, CartController.clearCart);

/**
 * @swagger
 * /api/v1/cart/merge:
 *   post:
 *     summary: Merge guest cart with user cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Carts merged successfully
 */
router.post('/merge', authenticate, CartController.mergeCarts);

/**
 * @swagger
 * /api/v1/cart/coupon:
 *   post:
 *     summary: Apply coupon to cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - couponCode
 *             properties:
 *               couponCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Coupon applied
 */
router.post(
  '/coupon',
  optionalAuth,
  validate(applyCouponSchema),
  CartController.applyCoupon
);

/**
 * @swagger
 * /api/v1/cart/coupon:
 *   delete:
 *     summary: Remove coupon from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coupon removed
 */
router.delete('/coupon', optionalAuth, CartController.removeCoupon);

/**
 * @swagger
 * /api/v1/cart/prices:
 *   put:
 *     summary: Update cart prices
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Prices updated
 */
router.put('/prices', optionalAuth, CartController.updatePrices);

export default router;

