import { PaymentService } from './service.js';
import { logger } from '../../utils/logger.js';

/**
 * PaymentController - Controller for payment operations
 * 
 * Handles:
 * - Initializing payments
 * - Verifying payments (gateway callbacks)
 * - Getting payment details
 * - Refunding payments
 */
export class PaymentController {
  /**
   * Initialize payment for order
   * POST /api/v1/payments
   */
  static async initializePayment(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id;
      const { orderId, gateway } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای پرداخت باید وارد شوید'
        });
      }

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'شناسه سفارش الزامی است'
        });
      }

      const result = await PaymentService.initializePayment(orderId, userId, gateway);

      res.status(200).json({
        success: true,
        message: 'درگاه پرداخت آماده است',
        data: {
          payment: result.payment,
          redirectUrl: result.redirectUrl
        }
      });
    } catch (error) {
      logger.error('Initialize payment error:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        ...(error.response && {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        })
      });
      next(error);
    }
  }

  /**
   * Verify payment (gateway callback)
   * POST /api/v1/payments/verify/:gateway
   */
  static async verifyPayment(req, res, next) {
    try {
      const { gateway } = req.params;
      const callbackData = req.body;

      logger.info('Payment verification request:', {
        gateway,
        callbackData: {
          ...callbackData,
          // Don't log sensitive data
          Authority: callbackData.Authority ? '***' : undefined,
          id: callbackData.id ? '***' : undefined
        }
      });

      const result = await PaymentService.verifyPayment(gateway, callbackData);

      logger.info('Payment verification result:', {
        success: result.success,
        hasRedirectUrl: !!result.redirectUrl,
        orderId: result.order?._id || result.order
      });

      // Return JSON with redirectUrl for frontend to handle
      // Frontend will perform the actual redirect
      return res.status(200).json({
        success: result.success,
        redirectUrl: result.redirectUrl,
        payment: result.payment ? {
          _id: result.payment._id,
          paymentNumber: result.payment.paymentNumber,
          status: result.payment.status
        } : undefined,
        order: result.order ? {
          _id: result.order._id,
          orderNumber: result.order.orderNumber
        } : undefined,
        error: result.error ? {
          message: result.error.message || result.error,
          code: result.error.code
        } : undefined
      });
    } catch (error) {
      logger.error('Verify payment error:', {
        message: error.message,
        stack: error.stack,
        gateway: req.params.gateway
      });
      
      // Return JSON with error redirect URL
      // In development, ALWAYS use localhost:3000 (where Next.js runs)
      // Ignore FRONTEND_URL in development to avoid port conflicts
      const frontendUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000'
        : (process.env.FRONTEND_URL || 'http://localhost:3000');
      const redirectUrl = `${frontendUrl}/orders/failed?error=${encodeURIComponent(error.message)}`;
      return res.status(500).json({
        success: false,
        redirectUrl,
        error: {
          message: error.message,
          code: 'VERIFICATION_ERROR'
        }
      });
    }
  }

  /**
   * Get payment by ID
   * GET /api/v1/payments/:id
   */
  static async getPaymentById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?._id;
      const isAdmin = req.user?.permissions?.includes('orders.read');

      const payment = await PaymentService.getPaymentById(id, isAdmin ? null : userId);

      res.status(200).json({
        success: true,
        data: { payment }
      });
    } catch (error) {
      logger.error('Get payment by ID error:', error);
      next(error);
    }
  }

  /**
   * Get payment by order
   * GET /api/v1/payments/order/:orderId
   */
  static async getPaymentByOrder(req, res, next) {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id || req.user?._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای مشاهده پرداخت باید وارد شوید'
        });
      }

      const payment = await PaymentService.getPaymentByOrder(orderId);

      // Check ownership
      if (payment.user.toString() !== userId.toString()) {
        const isAdmin = req.user?.permissions?.includes('orders.read');
        if (!isAdmin) {
          return res.status(403).json({
            success: false,
            message: 'شما اجازه مشاهده این پرداخت را ندارید'
          });
        }
      }

      res.status(200).json({
        success: true,
        data: { payment }
      });
    } catch (error) {
      logger.error('Get payment by order error:', error);
      next(error);
    }
  }

  /**
   * Get user payments
   * GET /api/v1/payments/me
   */
  static async getUserPayments(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای مشاهده پرداخت‌ها باید وارد شوید'
        });
      }

      const { page, limit, status } = req.query;

      const result = await PaymentService.getUserPayments(userId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        status
      });

      res.status(200).json({
        success: true,
        data: result.payments,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Get user payments error:', error);
      next(error);
    }
  }

  /**
   * Refund payment (admin only)
   * POST /api/v1/payments/:id/refund
   */
  static async refundPayment(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?._id;
      const { reason, amount } = req.body;

      const payment = await PaymentService.refundPayment(id, userId, {
        reason,
        amount
      });

      res.status(200).json({
        success: true,
        message: 'بازگشت وجه با موفقیت انجام شد',
        data: { payment }
      });
    } catch (error) {
      logger.error('Refund payment error:', error);
      next(error);
    }
  }
}

