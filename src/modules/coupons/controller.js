import { CouponService } from './service.js';
import { logger } from '../../utils/logger.js';

/**
 * CouponController - Controller for coupon operations
 * 
 * Handles:
 * - Validating coupons
 * - Applying coupons
 * - Managing coupons (admin)
 */
export class CouponController {
  /**
   * Validate coupon code
   * POST /api/v1/coupons/validate
   */
  static async validateCoupon(req, res, next) {
    try {
      const { code, orderAmount = 0, items = [] } = req.body;
      const userId = req.user?.id || req.user?._id || null;

      const result = await CouponService.validateCoupon(code, userId, orderAmount, items);

      if (result.valid) {
        res.status(200).json({
          success: true,
          message: 'کد تخفیف معتبر است',
          data: result.coupon
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || 'کد تخفیف نامعتبر است'
        });
      }
    } catch (error) {
      logger.error('Validate coupon error:', error);
      next(error);
    }
  }

  /**
   * Create coupon (admin only)
   * POST /api/v1/coupons
   */
  static async createCoupon(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id;
      const coupon = await CouponService.createCoupon(req.body, userId);

      res.status(201).json({
        success: true,
        message: 'کد تخفیف با موفقیت ایجاد شد',
        data: { coupon }
      });
    } catch (error) {
      logger.error('Create coupon error:', error);
      next(error);
    }
  }

  /**
   * Get coupons (admin only)
   * GET /api/v1/coupons
   */
  static async getCoupons(req, res, next) {
    try {
      const filters = {
        isActive: req.query.isActive,
        code: req.query.code,
        type: req.query.type,
        valid: req.query.valid
      };

      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 25
      };

      const result = await CouponService.getCoupons(filters, options);

      res.status(200).json({
        success: true,
        data: result.coupons,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Get coupons error:', error);
      next(error);
    }
  }

  /**
   * Get coupon by ID (admin only)
   * GET /api/v1/coupons/:id
   */
  static async getCouponById(req, res, next) {
    try {
      const { id } = req.params;
      const coupon = await CouponService.getCouponById(id);

      res.status(200).json({
        success: true,
        data: { coupon }
      });
    } catch (error) {
      logger.error('Get coupon by ID error:', error);
      next(error);
    }
  }

  /**
   * Update coupon (admin only)
   * PUT /api/v1/coupons/:id
   */
  static async updateCoupon(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?._id;
      const coupon = await CouponService.updateCoupon(id, req.body, userId);

      res.status(200).json({
        success: true,
        message: 'کد تخفیف با موفقیت به‌روزرسانی شد',
        data: { coupon }
      });
    } catch (error) {
      logger.error('Update coupon error:', error);
      next(error);
    }
  }

  /**
   * Delete coupon (admin only)
   * DELETE /api/v1/coupons/:id
   */
  static async deleteCoupon(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?._id;
      await CouponService.deleteCoupon(id, userId);

      res.status(200).json({
        success: true,
        message: 'کد تخفیف با موفقیت حذف شد'
      });
    } catch (error) {
      logger.error('Delete coupon error:', error);
      next(error);
    }
  }
}

