import { ShippingService } from './service.js';
import { logger } from '../../utils/logger.js';

/**
 * ShippingController - Controller for shipping operations
 * 
 * Handles:
 * - Address management (CRUD)
 * - Shipping cost calculation
 * - Shipping method management
 */
export class ShippingController {
  /**
   * Create shipping address
   * POST /api/v1/shipping/addresses
   */
  static async createAddress(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای افزودن آدرس باید وارد شوید'
        });
      }

      const address = await ShippingService.createAddress(userId, req.body);

      res.status(201).json({
        success: true,
        message: 'آدرس با موفقیت افزوده شد',
        data: { address }
      });
    } catch (error) {
      logger.error('Create address error:', error);
      next(error);
    }
  }

  /**
   * Get user addresses
   * GET /api/v1/shipping/addresses
   */
  static async getUserAddresses(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای مشاهده آدرس‌ها باید وارد شوید'
        });
      }

      const addresses = await ShippingService.getUserAddresses(userId);

      res.status(200).json({
        success: true,
        data: addresses
      });
    } catch (error) {
      logger.error('Get user addresses error:', error);
      next(error);
    }
  }

  /**
   * Get address by ID
   * GET /api/v1/shipping/addresses/:id
   */
  static async getAddressById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای مشاهده آدرس باید وارد شوید'
        });
      }

      const address = await ShippingService.getAddressById(id, userId);

      res.status(200).json({
        success: true,
        data: { address }
      });
    } catch (error) {
      logger.error('Get address by ID error:', error);
      next(error);
    }
  }

  /**
   * Update shipping address
   * PUT /api/v1/shipping/addresses/:id
   */
  static async updateAddress(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای ویرایش آدرس باید وارد شوید'
        });
      }

      const address = await ShippingService.updateAddress(id, userId, req.body);

      res.status(200).json({
        success: true,
        message: 'آدرس با موفقیت به‌روزرسانی شد',
        data: { address }
      });
    } catch (error) {
      logger.error('Update address error:', error);
      next(error);
    }
  }

  /**
   * Delete shipping address
   * DELETE /api/v1/shipping/addresses/:id
   */
  static async deleteAddress(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای حذف آدرس باید وارد شوید'
        });
      }

      await ShippingService.deleteAddress(id, userId);

      res.status(200).json({
        success: true,
        message: 'آدرس با موفقیت حذف شد'
      });
    } catch (error) {
      logger.error('Delete address error:', error);
      next(error);
    }
  }

  /**
   * Set address as default
   * POST /api/v1/shipping/addresses/:id/default
   */
  static async setDefaultAddress(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای تنظیم آدرس پیش‌فرض باید وارد شوید'
        });
      }

      const address = await ShippingService.setDefaultAddress(id, userId);

      res.status(200).json({
        success: true,
        message: 'آدرس پیش‌فرض تنظیم شد',
        data: { address }
      });
    } catch (error) {
      logger.error('Set default address error:', error);
      next(error);
    }
  }

  /**
   * Calculate shipping cost
   * POST /api/v1/shipping/calculate
   */
  static async calculateShippingCost(req, res, next) {
    try {
      const { method, items = [], orderTotal = 0, destination = null } = req.body;

      if (!method) {
        return res.status(400).json({
          success: false,
          message: 'روش ارسال الزامی است'
        });
      }

      const result = await ShippingService.calculateShippingCost(
        method,
        items,
        orderTotal,
        destination
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Calculate shipping cost error:', error);
      next(error);
    }
  }

  /**
   * Get available shipping methods
   * GET /api/v1/shipping/methods
   */
  static async getAvailableMethods(req, res, next) {
    try {
      const methods = await ShippingService.getAvailableMethods();

      res.status(200).json({
        success: true,
        data: methods
      });
    } catch (error) {
      logger.error('Get available methods error:', error);
      next(error);
    }
  }
}

