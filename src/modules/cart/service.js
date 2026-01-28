import { Cart } from './model.js';
import { Product } from '../products/model.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../utils/appError.js';
import { HTTP_STATUS } from '../../utils/httpStatus.js';

/**
 * CartService - Service layer for cart operations
 * 
 * Features:
 * - Smart cart with guest and user support
 * - Automatic expiry management (7 days)
 * - Price validation and updates
 * - Inventory checking
 * - Cart merging (guest to user)
 * - Notification tracking
 */
export class CartService {
  /**
   * Get or create cart for user
   * @param {string} userId - User ID
   * @returns {Promise<Cart>} Cart document
   */
  static async getOrCreateUserCart(userId) {
    try {
      const cart = await Cart.findOrCreateForUser(userId);
      await cart.populate({
        path: 'items.product',
        select: 'name slug featuredImage pricing inventory type digitalProduct physicalProduct'
      });
      
      // Recalculate totals in case prices changed
      cart.calculateTotals();
      await cart.save();
      
      return cart;
    } catch (error) {
      logger.error('Get user cart error:', error);
      throw new Error('خطا در دریافت سبد خرید');
    }
  }

  /**
   * Get or create cart for guest
   * @param {string} guestId - Guest ID (from cookie/localStorage)
   * @returns {Promise<Cart>} Cart document
   */
  static async getOrCreateGuestCart(guestId) {
    try {
      if (!guestId) {
        // Generate new guest ID
        guestId = uuidv4();
      }
      
      const cart = await Cart.findOrCreateForGuest(guestId);
      await cart.populate({
        path: 'items.product',
        select: 'name slug featuredImage pricing inventory type digitalProduct physicalProduct'
      });
      
      // Recalculate totals
      cart.calculateTotals();
      await cart.save();
      
      return { cart, guestId };
    } catch (error) {
      logger.error('Get guest cart error:', error);
      throw new Error('خطا در دریافت سبد خرید');
    }
  }

  /**
   * Add item to cart
   * @param {string} cartId - Cart ID
   * @param {string} productId - Product ID
   * @param {number} quantity - Quantity to add
   * @param {string} userId - User ID (optional, for validation)
   * @param {string} guestId - Guest ID (optional, for validation)
   * @returns {Promise<Cart>} Updated cart
   */
  static async addItem(cartId, productId, quantity = 1, userId = null, guestId = null) {
    try {
      // Find cart with proper ownership check
      const cart = await this._findCartWithOwnership(cartId, userId, guestId);
      
      // Validate product
      const product = await Product.findOne({
        _id: productId,
        deletedAt: null,
        status: 'active',
        isPublished: true
      });
      
      if (!product) {
        throw new AppError('محصول یافت نشد یا در دسترس نیست', HTTP_STATUS.NOT_FOUND);
      }
      
      // Check inventory for physical products
      if (product.type === 'physical' && product.inventory.trackInventory) {
        const currentQuantity = cart.items.find(
          item => item.product.toString() === productId
        )?.quantity || 0;
        
        const requestedQuantity = currentQuantity + quantity;
        
        if (requestedQuantity > product.inventory.quantity && !product.inventory.allowBackorder) {
          throw new AppError(`موجودی محصول کافی نیست. موجودی: ${product.inventory.quantity}`, HTTP_STATUS.BAD_REQUEST);
        }
      }
      
      // Check if product is a digital article product (one-time purchase only)
      // Article products (digitalProduct.contentType === 'article') can only be purchased once
      if (product.type === 'digital' && product.digitalProduct?.contentType === 'article' && userId) {
        const { Order } = await import('../orders/model.js');
        
        // Check if user has already purchased this product
        const existingOrder = await Order.findOne({
          user: userId,
          'items.product': productId,
          status: { $in: ['delivered', 'processing', 'shipped'] },
          'payment.status': 'completed',
          deletedAt: null
        });
        
        if (existingOrder) {
          throw new AppError('این محصول قبلاً خریداری شده است. محصولات مقاله‌ای فقط یکبار قابل خرید هستند.', HTTP_STATUS.BAD_REQUEST);
        }
      }
      
      // Get current price
      const currentPrice = product.pricing.isOnSale && product.pricing.salePrice
        ? product.pricing.salePrice
        : product.pricing.basePrice;
      
      // Add item
      cart.addItem(productId, quantity, currentPrice);
      
      // Extend expiry on activity
      cart.extendExpiry(7);
      
      await cart.save();
      await cart.populate({
        path: 'items.product',
        select: 'name slug featuredImage pricing inventory type'
      });
      
      logger.info(`Item added to cart: ${productId}, quantity: ${quantity}, cart: ${cartId}`);
      return cart;
    } catch (error) {
      logger.error('Add item to cart error:', error);
      throw error;
    }
  }

  /**
   * Update item quantity in cart
   * @param {string} cartId - Cart ID
   * @param {string} productId - Product ID
   * @param {number} quantity - New quantity
   * @param {string} userId - User ID (optional)
   * @param {string} guestId - Guest ID (optional)
   * @returns {Promise<Cart>} Updated cart
   */
  static async updateItemQuantity(cartId, productId, quantity, userId = null, guestId = null) {
    try {
      const cart = await this._findCartWithOwnership(cartId, userId, guestId);
      
      // Validate quantity
      if (quantity < 0) {
        throw new Error('تعداد نمی‌تواند منفی باشد');
      }
      
      // Check product inventory if updating quantity
      if (quantity > 0) {
        const product = await Product.findById(productId);
        if (product && product.type === 'physical' && product.inventory.trackInventory) {
          if (quantity > product.inventory.quantity && !product.inventory.allowBackorder) {
            throw new Error(`موجودی محصول کافی نیست. موجودی: ${product.inventory.quantity}`);
          }
        }
      }
      
      cart.updateItemQuantity(productId, quantity);
      cart.extendExpiry(7);
      
      await cart.save();
      await cart.populate({
        path: 'items.product',
        select: 'name slug featuredImage pricing inventory type'
      });
      
      return cart;
    } catch (error) {
      logger.error('Update item quantity error:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   * @param {string} cartId - Cart ID
   * @param {string} productId - Product ID
   * @param {string} userId - User ID (optional)
   * @param {string} guestId - Guest ID (optional)
   * @returns {Promise<Cart>} Updated cart
   */
  static async removeItem(cartId, productId, userId = null, guestId = null) {
    try {
      const cart = await this._findCartWithOwnership(cartId, userId, guestId);
      
      cart.removeItem(productId);
      cart.extendExpiry(7);
      
      await cart.save();
      await cart.populate({
        path: 'items.product',
        select: 'name slug featuredImage pricing inventory type'
      });
      
      return cart;
    } catch (error) {
      logger.error('Remove item from cart error:', error);
      throw error;
    }
  }

  /**
   * Clear cart
   * @param {string} cartId - Cart ID
   * @param {string} userId - User ID (optional)
   * @param {string} guestId - Guest ID (optional)
   * @returns {Promise<Cart>} Cleared cart
   */
  static async clearCart(cartId, userId = null, guestId = null) {
    try {
      const cart = await this._findCartWithOwnership(cartId, userId, guestId);
      
      cart.clear();
      cart.extendExpiry(7);
      
      await cart.save();
      return cart;
    } catch (error) {
      logger.error('Clear cart error:', error);
      throw error;
    }
  }

  /**
   * Merge guest cart with user cart
   * @param {string} guestCartId - Guest cart ID
   * @param {string} userId - User ID
   * @returns {Promise<Cart>} Merged user cart
   */
  static async mergeCarts(guestCartId, userId) {
    try {
      // Get purchased product IDs to filter out from guest cart
      const { OrderService } = await import('../orders/service.js');
      const purchasedProductIds = await OrderService.getPurchasedProductIds(userId);
      const purchasedProductIdsSet = new Set(purchasedProductIds.map(id => id.toString()));
      
      // Get guest cart
      const guestCart = await Cart.findOne({ guestId: guestCartId, status: 'active' })
        .populate('items.product', 'type digitalProduct');
      
      if (!guestCart || guestCart.items.length === 0) {
        // No guest cart or empty, just return user cart
        const userCart = await Cart.findOrCreateForUser(userId);
        await userCart.populate({
          path: 'items.product',
          select: 'name slug featuredImage pricing inventory type'
        });
        return userCart;
      }
      
      // Filter out purchased digital article products from guest cart
      const itemsToMerge = guestCart.items.filter(guestItem => {
        const product = guestItem.product;
        if (!product) return false;
        
        // Check if this is a purchased digital article product
        if (product.type === 'digital' && 
            product.digitalProduct?.contentType === 'article' &&
            purchasedProductIdsSet.has(product._id.toString())) {
          logger.info(`Skipping purchased product ${product._id} from guest cart merge`);
          return false;
        }
        
        return true;
      });
      
      // Get or create user cart
      const userCart = await Cart.findOrCreateForUser(userId);
      
      // Add non-purchased items to user cart
      for (const guestItem of itemsToMerge) {
        try {
          // Use addItem method which includes validation
          await this.addItem(
            userCart._id.toString(),
            guestItem.product._id.toString(),
            guestItem.quantity,
            userId,
            null
          );
        } catch (error) {
          // If addItem fails (e.g., product already in cart or purchased), log and continue
          logger.warn(`Failed to merge item ${guestItem.product._id} from guest cart: ${error.message}`);
        }
      }
      
      // Reload user cart with populated products
      await userCart.populate({
        path: 'items.product',
        select: 'name slug featuredImage pricing inventory type'
      });
      
      // Mark guest cart as archived (merged into user cart)
      guestCart.markAsConverted();
      await guestCart.save();
      
      logger.info(`Cart merged: guest ${guestCartId} -> user ${userId}, ${itemsToMerge.length} items merged, ${guestCart.items.length - itemsToMerge.length} purchased items skipped`);
      return userCart;
    } catch (error) {
      logger.error('Merge carts error:', error);
      throw error;
    }
  }

  /**
   * Apply coupon to cart
   * @param {string} cartId - Cart ID
   * @param {string} couponCode - Coupon code
   * @param {string} userId - User ID (optional)
   * @param {string} guestId - Guest ID (optional)
   * @returns {Promise<Cart>} Updated cart
   */
  static async applyCoupon(cartId, couponCode, userId = null, guestId = null) {
    try {
      const cart = await this._findCartWithOwnership(cartId, userId, guestId);
      
      // Validate coupon with coupon service
      const { CouponService } = await import('../coupons/service.js');
      
      // Prepare items for validation
      const items = cart.items.map(item => ({
        product: item.product,
        quantity: item.quantity
      }));
      
      const validation = await CouponService.validateCoupon(
        couponCode,
        userId,
        cart.totals.subtotal,
        items
      );
      
      if (!validation.valid) {
        throw new Error(validation.error || 'کد تخفیف نامعتبر است');
      }
      
      // Apply coupon
      cart.coupon = {
        code: validation.coupon.code,
        discount: validation.coupon.discount,
        discountType: validation.coupon.discountType
      };
      
      cart.calculateTotals();
      cart.extendExpiry(7);
      
      await cart.save();
      return cart;
    } catch (error) {
      logger.error('Apply coupon error:', error);
      throw error;
    }
  }

  /**
   * Remove coupon from cart
   * @param {string} cartId - Cart ID
   * @param {string} userId - User ID (optional)
   * @param {string} guestId - Guest ID (optional)
   * @returns {Promise<Cart>} Updated cart
   */
  static async removeCoupon(cartId, userId = null, guestId = null) {
    try {
      const cart = await this._findCartWithOwnership(cartId, userId, guestId);
      
      cart.coupon = {};
      cart.calculateTotals();
      
      await cart.save();
      return cart;
    } catch (error) {
      logger.error('Remove coupon error:', error);
      throw error;
    }
  }

  /**
   * Update cart prices (when products are on sale)
   * @param {string} cartId - Cart ID
   * @returns {Promise<Cart>} Updated cart
   */
  static async updatePrices(cartId) {
    try {
      const cart = await Cart.findById(cartId).populate('items.product');
      
      if (!cart) {
        throw new Error('سبد خرید یافت نشد');
      }
      
      // Update prices for each item
      cart.items.forEach(item => {
        if (item.product) {
          const product = item.product;
          const currentPrice = product.pricing.isOnSale && product.pricing.salePrice
            ? product.pricing.salePrice
            : product.pricing.basePrice;
          
          // Only update if price changed
          if (item.price !== currentPrice) {
            item.price = currentPrice;
            item.total = item.quantity * currentPrice;
          }
        }
      });
      
      cart.calculateTotals();
      await cart.save();
      
      return cart;
    } catch (error) {
      logger.error('Update cart prices error:', error);
      throw error;
    }
  }

  /**
   * Mark cart as abandoned
   * @param {string} cartId - Cart ID
   * @returns {Promise<void>}
   */
  static async markAsAbandoned(cartId) {
    try {
      const cart = await Cart.findById(cartId);
      if (cart && cart.status === 'active') {
        cart.markAsAbandoned();
        await cart.save();
      }
    } catch (error) {
      logger.error('Mark cart as abandoned error:', error);
    }
  }

  /**
   * Get carts expiring soon (for notifications)
   * @param {number} days - Days before expiry (default: 2)
   * @returns {Promise<Array>} Array of carts
   */
  static async getExpiringCarts(days = 2) {
    try {
      const carts = await Cart.findExpiringSoon(days);
      return carts;
    } catch (error) {
      logger.error('Get expiring carts error:', error);
      throw error;
    }
  }

  /**
   * Send expiry notifications for carts expiring soon
   * @param {number} daysBeforeExpiry - Days before expiry to send notification (default: 2)
   * @returns {Promise<number>} Number of notifications sent
   */
  static async sendExpiryNotifications(daysBeforeExpiry = 2) {
    try {
      const { Notification } = await import('../notifications/model.js');
      const expiringCarts = await Cart.findExpiringSoon(daysBeforeExpiry);
      let notificationsSent = 0;
      
      for (const cart of expiringCarts) {
        // Only send notifications for user carts (not guest carts)
        if (!cart.user) {
          continue;
        }
        
        // Check if notification already sent for this cart
        const existingNotification = await Notification.findOne({
          recipient: cart.user,
          type: 'cart_expiring',
          'relatedEntity.type': 'cart',
          'relatedEntity.id': cart._id,
          isRead: false,
          createdAt: {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Within last 24 hours
          }
        });
        
        if (existingNotification) {
          continue; // Already notified
        }
        
        // Calculate time until expiry
        const timeUntilExpiry = cart.getTimeUntilExpiry();
        let message = '';
        let title = '';
        
        if (timeUntilExpiry.days > 0) {
          title = {
            fa: 'سبد خرید شما در حال انقضا است',
            en: 'Your cart is expiring soon'
          };
          message = {
            fa: `سبد خرید شما ${timeUntilExpiry.days} روز دیگر منقضی می‌شود. برای تکمیل خرید اقدام کنید.`,
            en: `Your cart will expire in ${timeUntilExpiry.days} days. Please complete your purchase.`
          };
        } else if (timeUntilExpiry.hours > 0) {
          title = {
            fa: 'سبد خرید شما به زودی منقضی می‌شود',
            en: 'Your cart is expiring soon'
          };
          message = {
            fa: `سبد خرید شما ${timeUntilExpiry.hours} ساعت دیگر منقضی می‌شود. برای تکمیل خرید اقدام کنید.`,
            en: `Your cart will expire in ${timeUntilExpiry.hours} hours. Please complete your purchase.`
          };
        } else {
          title = {
            fa: 'سبد خرید شما به زودی منقضی می‌شود',
            en: 'Your cart is expiring soon'
          };
          message = {
            fa: `سبد خرید شما ${timeUntilExpiry.minutes} دقیقه دیگر منقضی می‌شود. برای تکمیل خرید اقدام کنید.`,
            en: `Your cart will expire in ${timeUntilExpiry.minutes} minutes. Please complete your purchase.`
          };
        }
        
        // Create notification
        await Notification.create({
          type: 'cart_expiring',
          title,
          message,
          recipient: cart.user,
          relatedEntity: {
            type: 'cart',
            id: cart._id
          },
          priority: timeUntilExpiry.days === 0 && timeUntilExpiry.hours < 2 ? 'high' : 'normal',
          actionUrl: '/cart'
        });
        
        notificationsSent++;
      }
      
      logger.info(`Sent ${notificationsSent} cart expiry notifications`);
      return notificationsSent;
    } catch (error) {
      logger.error('Send expiry notifications error:', error);
      throw error;
    }
  }

  /**
   * Send expired cart notifications
   * @returns {Promise<number>} Number of notifications sent
   */
  static async sendExpiredNotifications() {
    try {
      const { Notification } = await import('../notifications/model.js');
      const expiredCarts = await Cart.findExpired();
      let notificationsSent = 0;
      
      for (const cart of expiredCarts) {
        // Only send notifications for user carts
        if (!cart.user || cart.status === 'archived') {
          continue;
        }
        
        // Check if notification already sent
        const existingNotification = await Notification.findOne({
          recipient: cart.user,
          type: 'cart_expired',
          'relatedEntity.type': 'cart',
          'relatedEntity.id': cart._id,
          isRead: false,
          createdAt: {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Within last 24 hours
          }
        });
        
        if (existingNotification) {
          continue;
        }
        
        // Create notification
        await Notification.create({
          type: 'cart_expired',
          title: {
            fa: 'سبد خرید شما منقضی شد',
            en: 'Your cart has expired'
          },
          message: {
            fa: 'سبد خرید شما منقضی شده است. می‌توانید محصولات را دوباره به سبد خرید اضافه کنید.',
            en: 'Your cart has expired. You can add products to your cart again.'
          },
          recipient: cart.user,
          relatedEntity: {
            type: 'cart',
            id: cart._id
          },
          priority: 'normal',
          actionUrl: '/products'
        });
        
        // Mark cart as archived
        cart.status = 'archived';
        await cart.save();
        
        notificationsSent++;
      }
      
      logger.info(`Sent ${notificationsSent} expired cart notifications`);
      return notificationsSent;
    } catch (error) {
      logger.error('Send expired notifications error:', error);
      throw error;
    }
  }

  /**
   * Clean expired carts (cron job)
   * @returns {Promise<number>} Number of carts cleaned
   */
  static async cleanExpiredCarts() {
    try {
      const expiredCarts = await Cart.findExpired();
      let cleaned = 0;
      
      for (const cart of expiredCarts) {
        cart.status = 'archived';
        await cart.save();
        cleaned++;
      }
      
      logger.info(`Cleaned ${cleaned} expired carts`);
      return cleaned;
    } catch (error) {
      logger.error('Clean expired carts error:', error);
      throw error;
    }
  }

  /**
   * Private: Find cart with ownership validation
   * @private
   */
  static async _findCartWithOwnership(cartId, userId, guestId) {
    const cart = await Cart.findById(cartId);
    
    if (!cart) {
      throw new Error('سبد خرید یافت نشد');
    }
    
    // Check ownership
    if (userId && cart.user && cart.user.toString() !== userId.toString()) {
      throw new Error('دسترسی غیرمجاز به سبد خرید');
    }
    
    if (guestId && cart.guestId && cart.guestId !== guestId) {
      throw new Error('دسترسی غیرمجاز به سبد خرید');
    }
    
    // Check if cart is expired
    if (cart.isExpired() && cart.status === 'active') {
      cart.status = 'archived';
      await cart.save();
      throw new Error('سبد خرید منقضی شده است');
    }
    
    return cart;
  }
}

