import { Coupon } from './model.js';
import { Product } from '../products/model.js';
import { Order } from '../orders/model.js';
import { logger } from '../../utils/logger.js';

/**
 * CouponService - Service layer for coupon operations
 * 
 * Features:
 * - Coupon validation
 * - Discount calculation
 * - Usage tracking
 * - Product/category restrictions
 */
export class CouponService {
  /**
   * Validate coupon code
   * @param {string} code - Coupon code
   * @param {string} userId - User ID (optional)
   * @param {number} orderAmount - Order amount (optional)
   * @param {Array} items - Cart/Order items (optional)
   * @returns {Promise<Object>} Validation result
   */
  static async validateCoupon(code, userId = null, orderAmount = 0, items = []) {
    try {
      if (!code || !code.trim()) {
        return {
          valid: false,
          error: 'کد تخفیف الزامی است'
        };
      }

      // Find coupon
      const coupon = await Coupon.findActiveByCode(code.trim());

      if (!coupon) {
        return {
          valid: false,
          error: 'کد تخفیف یافت نشد یا منقضی شده است'
        };
      }

      // Check basic validity
      const validity = coupon.isValid();
      if (!validity.valid) {
        return {
          valid: false,
          error: validity.reason
        };
      }

      // Check user-specific restrictions
      if (userId) {
        const userValidity = coupon.canBeUsedByUser(userId, orderAmount);
        if (!userValidity.valid) {
          return {
            valid: false,
            error: userValidity.reason
          };
        }
      } else if (orderAmount > 0) {
        // For guest users, check minimum order amount
        if (orderAmount < coupon.limits.minOrderAmount) {
          return {
            valid: false,
            error: `حداقل مبلغ سفارش برای استفاده از این کد ${coupon.limits.minOrderAmount.toLocaleString('fa-IR')} تومان است`
          };
        }
      }

      // Check if coupon applies to items
      if (items.length > 0) {
        let applicableItems = 0;
        for (const item of items) {
          const product = await Product.findById(item.product);
          if (product) {
            const categoryIds = product.categories || [];
            if (coupon.appliesToProduct(product._id, categoryIds)) {
              applicableItems++;
            }
          }
        }

        if (applicableItems === 0) {
          return {
            valid: false,
            error: 'این کد تخفیف برای محصولات انتخابی شما معتبر نیست'
          };
        }
      }

      // Calculate discount
      const discountAmount = coupon.calculateDiscount(orderAmount);

      return {
        valid: true,
        coupon: {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          discount: discountAmount,
          discountType: coupon.type
        }
      };
    } catch (error) {
      logger.error('Validate coupon error:', error);
      return {
        valid: false,
        error: 'خطا در اعتبارسنجی کد تخفیف'
      };
    }
  }

  /**
   * Apply coupon to order/cart
   * @param {string} code - Coupon code
   * @param {string} userId - User ID
   * @param {number} orderAmount - Order amount
   * @param {Array} items - Order items
   * @param {string} orderId - Order ID (for tracking)
   * @returns {Promise<Object>} Application result
   */
  static async applyCoupon(code, userId, orderAmount, items = [], orderId = null) {
    try {
      // Validate coupon
      const validation = await this.validateCoupon(code, userId, orderAmount, items);

      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Get coupon
      const coupon = await Coupon.findActiveByCode(code.trim());

      // Calculate discount
      const discountAmount = coupon.calculateDiscount(orderAmount);

      // Record usage if order ID provided
      if (orderId && userId) {
        await coupon.recordUsage(userId, orderId, discountAmount);
      }

      logger.info(`Coupon applied: ${code}, discount: ${discountAmount}, user: ${userId}`);

      return {
        success: true,
        coupon: {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          discount: discountAmount,
          discountType: coupon.type
        }
      };
    } catch (error) {
      logger.error('Apply coupon error:', error);
      throw error;
    }
  }

  /**
   * Create coupon
   * @param {Object} couponData - Coupon data
   * @param {string} userId - User ID (admin)
   * @returns {Promise<Coupon>} Created coupon
   */
  static async createCoupon(couponData, userId) {
    try {
      // Normalize code
      const code = couponData.code.toUpperCase().trim();

      // Check if code already exists
      const existing = await Coupon.findOne({ code, deletedAt: null });
      if (existing) {
        throw new Error('کد تخفیف با این نام قبلاً وجود دارد');
      }

      const coupon = new Coupon({
        ...couponData,
        code,
        createdBy: userId
      });

      await coupon.save();

      logger.info(`Coupon created: ${code}, by: ${userId}`);
      return coupon;
    } catch (error) {
      logger.error('Create coupon error:', error);
      throw error;
    }
  }

  /**
   * Get coupon by ID
   * @param {string} couponId - Coupon ID
   * @returns {Promise<Coupon>} Coupon document
   */
  static async getCouponById(couponId) {
    try {
      const coupon = await Coupon.findById(couponId);

      if (!coupon || coupon.deletedAt) {
        throw new Error('کد تخفیف یافت نشد');
      }

      return coupon;
    } catch (error) {
      logger.error('Get coupon by ID error:', error);
      throw error;
    }
  }

  /**
   * Get coupons with filters
   * @param {Object} filters - Filter options
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Coupons and pagination
   */
  static async getCoupons(filters = {}, options = {}) {
    try {
      const page = parseInt(options.page) || 1;
      const limit = parseInt(options.limit) || 25;
      const skip = (page - 1) * limit;

      const query = { deletedAt: null };

      // Apply filters
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      if (filters.code) {
        query.code = { $regex: filters.code.toUpperCase(), $options: 'i' };
      }

      if (filters.type) {
        query.type = filters.type;
      }

      if (filters.valid) {
        const now = new Date();
        query.validFrom = { $lte: now };
        query.validUntil = { $gte: now };
        query.isActive = true;
      }

      const [coupons, total] = await Promise.all([
        Coupon.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Coupon.countDocuments(query)
      ]);

      return {
        coupons,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Get coupons error:', error);
      throw error;
    }
  }

  /**
   * Update coupon
   * @param {string} couponId - Coupon ID
   * @param {Object} updateData - Update data
   * @param {string} userId - User ID (admin)
   * @returns {Promise<Coupon>} Updated coupon
   */
  static async updateCoupon(couponId, updateData, userId) {
    try {
      const coupon = await this.getCouponById(couponId);

      // If code is being updated, check uniqueness
      if (updateData.code) {
        const normalizedCode = updateData.code.toUpperCase().trim();
        const existing = await Coupon.findOne({
          code: normalizedCode,
          _id: { $ne: couponId },
          deletedAt: null
        });

        if (existing) {
          throw new Error('کد تخفیف با این نام قبلاً وجود دارد');
        }

        updateData.code = normalizedCode;
      }

      Object.assign(coupon, updateData);
      coupon.updatedBy = userId;
      await coupon.save();

      logger.info(`Coupon updated: ${coupon.code}, by: ${userId}`);
      return coupon;
    } catch (error) {
      logger.error('Update coupon error:', error);
      throw error;
    }
  }

  /**
   * Delete coupon
   * @param {string} couponId - Coupon ID
   * @param {string} userId - User ID (admin)
   * @returns {Promise<void>}
   */
  static async deleteCoupon(couponId, userId) {
    try {
      const coupon = await this.getCouponById(couponId);
      await coupon.softDelete(userId);

      logger.info(`Coupon deleted: ${coupon.code}, by: ${userId}`);
    } catch (error) {
      logger.error('Delete coupon error:', error);
      throw error;
    }
  }
}

