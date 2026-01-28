import { OrderService } from './service.js';
import { Order } from './model.js';
import { logger } from '../../utils/logger.js';

/**
 * OrderController - Controller for order operations
 * 
 * Handles:
 * - Creating orders from cart
 * - Getting user orders
 * - Getting order details
 * - Updating order status (admin)
 * - Cancelling orders
 */
export class OrderController {
  /**
   * Create order from cart
   * POST /api/v1/orders
   */
  static async createOrder(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای ایجاد سفارش باید وارد شوید'
        });
      }

      const orderData = req.body;
      
      const order = await OrderService.createOrderFromCart(userId, orderData);
      
      res.status(201).json({
        success: true,
        message: 'سفارش با موفقیت ایجاد شد',
        data: { order }
      });
    } catch (error) {
      logger.error('Create order error:', error);
      next(error);
    }
  }

  /**
   * Get user orders
   * GET /api/v1/orders/me
   */
  static async getUserOrders(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای مشاهده سفارشات باید وارد شوید'
        });
      }

      const { page, limit, status } = req.query;
      
      const result = await OrderService.getUserOrders(userId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        status
      });
      
      res.status(200).json({
        success: true,
        data: result.orders,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Get user orders error:', error);
      next(error);
    }
  }

  /**
   * Get order by ID
   * GET /api/v1/orders/:id
   */
  static async getOrderById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?._id;
      const isAdmin = req.user?.roles?.some(role => role.permissions?.includes('orders.read'));
      
      // Users can only see their own orders, admins can see all
      const order = await OrderService.getOrderById(
        id,
        isAdmin ? null : userId
      );
      
      res.status(200).json({
        success: true,
        data: { order }
      });
    } catch (error) {
      logger.error('Get order by ID error:', error);
      next(error);
    }
  }

  /**
   * Get orders (admin only)
   * GET /api/v1/orders
   */
  static async getOrders(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        paymentStatus: req.query.paymentStatus,
        orderNumber: req.query.orderNumber,
        userId: req.query.userId,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo
      };

      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 25
      };

      const result = await OrderService.getOrders(filters, options);
      
      res.status(200).json({
        success: true,
        data: result.orders,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Get orders error:', error);
      next(error);
    }
  }

  /**
   * Update order status (admin only)
   * PUT /api/v1/orders/:id/status
   */
  static async updateOrderStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, note } = req.body;
      const userId = req.user?.id || req.user?._id;
      
      const order = await OrderService.updateOrderStatus(id, status, userId, note);
      
      res.status(200).json({
        success: true,
        message: 'وضعیت سفارش به‌روزرسانی شد',
        data: { order }
      });
    } catch (error) {
      logger.error('Update order status error:', error);
      next(error);
    }
  }

  /**
   * Cancel order
   * POST /api/v1/orders/:id/cancel
   */
  static async cancelOrder(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id || req.user?._id;
      
      const order = await OrderService.cancelOrder(id, userId, reason);
      
      res.status(200).json({
        success: true,
        message: 'سفارش لغو شد',
        data: { order }
      });
    } catch (error) {
      logger.error('Cancel order error:', error);
      next(error);
    }
  }

  /**
   * Mark order as paid (for payment gateway callbacks)
   * POST /api/v1/orders/:id/payment
   */
  static async markOrderAsPaid(req, res, next) {
    try {
      const { id } = req.params;
      const { transactionId, gateway, gatewayResponse } = req.body;
      
      const order = await OrderService.markOrderAsPaid(id, transactionId, gateway, gatewayResponse);
      
      res.status(200).json({
        success: true,
        message: 'پرداخت تأیید شد',
        data: { order }
      });
    } catch (error) {
      logger.error('Mark order as paid error:', error);
      next(error);
    }
  }

  /**
   * Download digital product from order
   * GET /api/v1/orders/:id/items/:itemId/download
   */
  static async downloadDigitalProduct(req, res, next) {
    try {
      const { id: orderId, itemId } = req.params;
      const userId = req.user?.id || req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای دانلود باید وارد شوید'
        });
      }

      const result = await OrderService.downloadDigitalProduct(orderId, itemId, userId);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Download digital product error:', error);
      next(error);
    }
  }

  /**
   * Download invoice PDF for order
   * GET /api/v1/orders/:id/invoice
   */
  static async downloadInvoice(req, res, next) {
    try {
      const { id: orderId } = req.params;
      const userId = req.user?.id || req.user?._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای دانلود فاکتور باید وارد شوید'
        });
      }

      const pdfBuffer = await OrderService.generateInvoice(orderId, userId);

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice_${orderId}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Download invoice error:', error);
      next(error);
    }
  }

  /**
   * Get purchased product IDs
   * GET /api/v1/orders/purchased-products
   */
  static async getPurchasedProducts(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای مشاهده محصولات خریداری شده باید وارد شوید'
        });
      }

      const productIds = await OrderService.getPurchasedProductIds(userId);
      
      res.status(200).json({
        success: true,
        data: {
          productIds
        }
      });
    } catch (error) {
      logger.error('Get purchased products error:', error);
      next(error);
    }
  }
}

