import { CartService } from './service.js';
import { Cart } from './model.js';
import { logger } from '../../utils/logger.js';
import { handleGetList } from '../../shared/controllers/baseController.js';

/**
 * CartController - Controller for cart operations
 * 
 * Handles:
 * - Getting user/guest cart
 * - Adding/removing items
 * - Updating quantities
 * - Applying coupons
 * - Cart merging
 */
export class CartController {
  /**
   * Get user cart
   * GET /api/v1/cart
   */
  static async getUserCart(req, res, next) {
    try {
      // authenticate middleware sets req.user.id (not _id)
      const userId = req.user?.id || req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای دسترسی به سبد خرید باید وارد شوید'
        });
      }
      
      const cart = await CartService.getOrCreateUserCart(userId);
      
      res.status(200).json({
        success: true,
        data: { cart }
      });
    } catch (error) {
      logger.error('Get user cart error:', error);
      next(error);
    }
  }

  /**
   * Get guest cart
   * GET /api/v1/cart/guest
   */
  static async getGuestCart(req, res, next) {
    try {
      const guestId = req.headers['x-guest-id'] || req.cookies?.guestId;
      
      const { cart, guestId: newGuestId } = await CartService.getOrCreateGuestCart(guestId);
      
      // Set guest ID in response header and cookie
      res.cookie('guestId', newGuestId, {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      
      res.setHeader('X-Guest-ID', newGuestId);
      
      res.status(200).json({
        success: true,
        data: { 
          cart,
          guestId: newGuestId
        }
      });
    } catch (error) {
      logger.error('Get guest cart error:', error);
      next(error);
    }
  }

  /**
   * Add item to cart
   * POST /api/v1/cart/items
   */
  static async addItem(req, res, next) {
    try {
      const { productId, quantity = 1 } = req.body;
      // authenticate middleware sets req.user.id (not _id)
      const userId = req.user?.id || req.user?._id;
      const guestId = req.headers['x-guest-id'] || req.cookies?.guestId;
      
      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'شناسه محصول الزامی است'
        });
      }
      
      // Get or create cart
      let cart;
      if (userId) {
        cart = await CartService.getOrCreateUserCart(userId);
      } else {
        const result = await CartService.getOrCreateGuestCart(guestId);
        cart = result.cart;
        if (result.guestId && result.guestId !== guestId) {
          res.cookie('guestId', result.guestId, {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
          });
        }
      }
      
      // Add item
      const updatedCart = await CartService.addItem(
        cart._id,
        productId,
        quantity,
        userId,
        cart.guestId
      );
      
      res.status(200).json({
        success: true,
        message: 'محصول به سبد خرید اضافه شد',
        data: { cart: updatedCart }
      });
    } catch (error) {
      logger.error('Add item to cart error:', error);
      next(error);
    }
  }

  /**
   * Update item quantity
   * PUT /api/v1/cart/items/:productId
   */
  static async updateItemQuantity(req, res, next) {
    try {
      const { productId } = req.params;
      const { quantity } = req.body;
      // authenticate middleware sets req.user.id (not _id)
      const userId = req.user?.id || req.user?._id;
      const guestId = req.headers['x-guest-id'] || req.cookies?.guestId;
      
      if (quantity === undefined || quantity < 0) {
        return res.status(400).json({
          success: false,
          message: 'تعداد معتبر وارد کنید'
        });
      }
      
      // Get cart
      let cart;
      if (userId) {
        cart = await CartService.getOrCreateUserCart(userId);
      } else {
        const result = await CartService.getOrCreateGuestCart(guestId);
        cart = result.cart;
      }
      
      const updatedCart = await CartService.updateItemQuantity(
        cart._id,
        productId,
        quantity,
        userId,
        cart.guestId
      );
      
      res.status(200).json({
        success: true,
        message: 'تعداد محصول به‌روزرسانی شد',
        data: { cart: updatedCart }
      });
    } catch (error) {
      logger.error('Update item quantity error:', error);
      next(error);
    }
  }

  /**
   * Remove item from cart
   * DELETE /api/v1/cart/items/:productId
   */
  static async removeItem(req, res, next) {
    try {
      const { productId } = req.params;
      // authenticate middleware sets req.user.id (not _id)
      const userId = req.user?.id || req.user?._id;
      const guestId = req.headers['x-guest-id'] || req.cookies?.guestId;
      
      // Get cart
      let cart;
      if (userId) {
        cart = await CartService.getOrCreateUserCart(userId);
      } else {
        const result = await CartService.getOrCreateGuestCart(guestId);
        cart = result.cart;
      }
      
      const updatedCart = await CartService.removeItem(
        cart._id,
        productId,
        userId,
        cart.guestId
      );
      
      res.status(200).json({
        success: true,
        message: 'محصول از سبد خرید حذف شد',
        data: { cart: updatedCart }
      });
    } catch (error) {
      logger.error('Remove item from cart error:', error);
      next(error);
    }
  }

  /**
   * Clear cart
   * DELETE /api/v1/cart
   */
  static async clearCart(req, res, next) {
    try {
      // authenticate middleware sets req.user.id (not _id)
      const userId = req.user?.id || req.user?._id;
      const guestId = req.headers['x-guest-id'] || req.cookies?.guestId;
      
      // Get cart
      let cart;
      if (userId) {
        cart = await CartService.getOrCreateUserCart(userId);
      } else {
        const result = await CartService.getOrCreateGuestCart(guestId);
        cart = result.cart;
      }
      
      await CartService.clearCart(cart._id, userId, cart.guestId);
      
      res.status(200).json({
        success: true,
        message: 'سبد خرید خالی شد',
        data: { cart }
      });
    } catch (error) {
      logger.error('Clear cart error:', error);
      next(error);
    }
  }

  /**
   * Merge guest cart with user cart (on login)
   * POST /api/v1/cart/merge
   */
  static async mergeCarts(req, res, next) {
    try {
      // authenticate middleware sets req.user.id (not _id)
      const userId = req.user?.id || req.user?._id;
      const guestId = req.headers['x-guest-id'] || req.cookies?.guestId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای ادغام سبد خرید باید وارد شوید'
        });
      }
      
      if (!guestId) {
        return res.status(400).json({
          success: false,
          message: 'شناسه مهمان یافت نشد'
        });
      }
      
      const mergedCart = await CartService.mergeCarts(guestId, userId);
      
      // Clear guest cookie
      res.clearCookie('guestId');
      
      res.status(200).json({
        success: true,
        message: 'سبد خرید ادغام شد',
        data: { cart: mergedCart }
      });
    } catch (error) {
      logger.error('Merge carts error:', error);
      next(error);
    }
  }

  /**
   * Apply coupon
   * POST /api/v1/cart/coupon
   */
  static async applyCoupon(req, res, next) {
    try {
      const { couponCode } = req.body;
      // authenticate middleware sets req.user.id (not _id)
      const userId = req.user?.id || req.user?._id;
      const guestId = req.headers['x-guest-id'] || req.cookies?.guestId;
      
      if (!couponCode) {
        return res.status(400).json({
          success: false,
          message: 'کد تخفیف الزامی است'
        });
      }
      
      // Get cart
      let cart;
      if (userId) {
        cart = await CartService.getOrCreateUserCart(userId);
      } else {
        const result = await CartService.getOrCreateGuestCart(guestId);
        cart = result.cart;
      }
      
      const updatedCart = await CartService.applyCoupon(
        cart._id,
        couponCode,
        userId,
        cart.guestId
      );
      
      res.status(200).json({
        success: true,
        message: 'کد تخفیف اعمال شد',
        data: { cart: updatedCart }
      });
    } catch (error) {
      logger.error('Apply coupon error:', error);
      next(error);
    }
  }

  /**
   * Remove coupon
   * DELETE /api/v1/cart/coupon
   */
  static async removeCoupon(req, res, next) {
    try {
      // authenticate middleware sets req.user.id (not _id)
      const userId = req.user?.id || req.user?._id;
      const guestId = req.headers['x-guest-id'] || req.cookies?.guestId;
      
      // Get cart
      let cart;
      if (userId) {
        cart = await CartService.getOrCreateUserCart(userId);
      } else {
        const result = await CartService.getOrCreateGuestCart(guestId);
        cart = result.cart;
      }
      
      const updatedCart = await CartService.removeCoupon(
        cart._id,
        userId,
        cart.guestId
      );
      
      res.status(200).json({
        success: true,
        message: 'کد تخفیف حذف شد',
        data: { cart: updatedCart }
      });
    } catch (error) {
      logger.error('Remove coupon error:', error);
      next(error);
    }
  }

  /**
   * Update cart prices (when products go on sale)
   * PUT /api/v1/cart/prices
   */
  static async updatePrices(req, res, next) {
    try {
      // authenticate middleware sets req.user.id (not _id)
      const userId = req.user?.id || req.user?._id;
      const guestId = req.headers['x-guest-id'] || req.cookies?.guestId;
      
      // Get cart
      let cart;
      if (userId) {
        cart = await CartService.getOrCreateUserCart(userId);
      } else {
        const result = await CartService.getOrCreateGuestCart(guestId);
        cart = result.cart;
      }
      
      const updatedCart = await CartService.updatePrices(cart._id);
      
      res.status(200).json({
        success: true,
        message: 'قیمت‌های سبد خرید به‌روزرسانی شد',
        data: { cart: updatedCart }
      });
    } catch (error) {
      logger.error('Update cart prices error:', error);
      next(error);
    }
  }
}

