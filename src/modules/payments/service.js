import { Payment } from './model.js';
import { Order } from '../orders/model.js';
import { OrderService } from '../orders/service.js';
import { GatewayFactory } from './gateways/index.js';
import { logger } from '../../utils/logger.js';

/**
 * PaymentService - Service layer for payment operations
 * 
 * Features:
 * - Initialize payment with gateway
 * - Verify payment
 * - Handle payment callbacks
 * - Refund payments
 */
export class PaymentService {
  /**
   * Initialize payment for order
   * @param {string} orderId - Order ID
   * @param {string} userId - User ID
   * @param {string} gatewayName - Gateway name (optional)
   * @returns {Promise<Object>} Payment initialization result
   */
  static async initializePayment(orderId, userId, gatewayName = null) {
    try {
      // Get order
      const order = await Order.findOne({
        _id: orderId,
        user: userId,
        deletedAt: null
      });

      if (!order) {
        throw new Error('سفارش یافت نشد');
      }

      // Check if order is already paid
      if (order.payment.status === 'completed') {
        throw new Error('این سفارش قبلاً پرداخت شده است');
      }

      // Check if payment method is online
      if (order.payment.method !== 'online') {
        throw new Error('این سفارش برای پرداخت آنلاین نیست');
      }

      // Check if payment already exists
      let payment = await Payment.findByOrder(orderId);
      
      if (payment && payment.status === 'completed') {
        throw new Error('این سفارش قبلاً پرداخت شده است');
      }

      // Create new payment if doesn't exist or previous one failed
      if (!payment || payment.status === 'failed' || payment.status === 'cancelled') {
        payment = new Payment({
          order: orderId,
          user: userId,
          amount: order.totals.total,
          method: order.payment.method,
          gateway: gatewayName || 'zarinpal',
          status: 'pending',
          metadata: {
            description: `پرداخت سفارش ${order.orderNumber}`,
            customerInfo: {
              name: order.contactInfo.fullName,
              email: order.contactInfo.email,
              phone: order.contactInfo.phoneNumber
            }
          }
        });
      }

      // Get gateway
      const gateway = GatewayFactory.getGateway(payment.gateway);

      // Prepare callback URL
      // In development, ALWAYS use localhost:3000 (where Next.js runs)
      // Ignore FRONTEND_URL in development to avoid port conflicts
      // In production, use FRONTEND_URL from environment
      const frontendUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000'
        : (process.env.FRONTEND_URL || 'http://localhost:3000');
      const callbackUrl = `${frontendUrl}/api/payments/callback/${payment.gateway}`;
      
      logger.info('Payment callback URL:', {
        callbackUrl,
        frontendUrl,
        gateway: payment.gateway,
        nodeEnv: process.env.NODE_ENV
      });

      // Initialize payment with gateway
      const initResult = await gateway.initialize({
        amount: payment.amount,
        description: payment.metadata.description,
        callbackUrl: callbackUrl,
        orderId: order.orderNumber,
        metadata: payment.metadata.customerInfo
      });

      if (!initResult.success) {
        // Mark payment as failed - handle both new and existing payments
        try {
          // Check if payment is already saved (has _id)
          if (payment._id) {
            // Existing payment - use markAsFailed method
        await payment.markAsFailed(initResult.error);
          } else {
            // New payment - set status directly and save
            payment.status = 'failed';
            payment.error = {
              code: initResult.error.code || 'PAYMENT_FAILED',
              message: initResult.error.message || 'Payment failed',
              details: initResult.error.details
            };
            payment.timestamps.failedAt = new Date();
            await payment.save();
          }
        } catch (saveError) {
          logger.error('Error saving failed payment:', {
            message: saveError.message,
            stack: saveError.stack,
            paymentId: payment._id,
            orderId: orderId,
            errorDetails: saveError
          });
          // Continue to throw the original error even if saving failed
        }
        throw new Error(initResult.error.message || 'خطا در اتصال به درگاه پرداخت');
      }

      // Update payment with gateway response
      payment.transaction.authority = initResult.authority;
      payment.urls.redirectUrl = initResult.redirectUrl;
      payment.urls.callbackUrl = callbackUrl;
      payment.transaction.gatewayResponse = initResult.gatewayResponse;
      payment.status = 'processing';
      payment.timestamps.processedAt = new Date();

      await payment.save();

      logger.info(`Payment initialized: ${payment.paymentNumber}, order: ${order.orderNumber}, gateway: ${payment.gateway}`, {
        authority: initResult.authority,
        redirectUrl: initResult.redirectUrl,
        orderId: orderId,
        userId: userId
      });

      return {
        payment,
        redirectUrl: initResult.redirectUrl
      };
    } catch (error) {
      logger.error('Initialize payment error:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        orderId: orderId,
        userId: userId,
        gateway: gatewayName,
        ...(error.response && {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        })
      });
      
      // Re-throw with more context if needed
      if (error.message) {
      throw error;
      } else {
        throw new Error(`خطا در پردازش پرداخت: ${error.message || 'خطای نامشخص'}`);
      }
    }
  }

  /**
   * Verify payment (from gateway callback)
   * @param {string} gatewayName - Gateway name
   * @param {Object} callbackData - Callback data from gateway
   * @returns {Promise<Object>} Verification result
   */
  static async verifyPayment(gatewayName, callbackData) {
    try {
      // Get gateway
      const gateway = GatewayFactory.getGateway(gatewayName);

      // Validate callback data
      if (!gateway.validateCallback(callbackData)) {
        throw new Error('داده‌های بازگشتی از درگاه نامعتبر است');
      }

      // Find payment by authority
      const authority = callbackData.Authority || callbackData.id;
      const payment = await Payment.findByAuthority(authority);

      if (!payment) {
        throw new Error('پرداخت یافت نشد');
      }

      // Check if already verified
      if (payment.status === 'completed') {
        const order = await Order.findById(payment.order);
        // In development, ALWAYS use localhost:3000 (where Next.js runs)
        // Ignore FRONTEND_URL in development to avoid port conflicts
        const frontendUrl = process.env.NODE_ENV === 'development' 
          ? 'http://localhost:3000'
          : (process.env.FRONTEND_URL || 'http://localhost:3000');
        return {
          success: true,
          payment,
          order,
          message: 'پرداخت قبلاً تایید شده است',
          redirectUrl: `${frontendUrl}/orders/${order._id}/success`
        };
      }

      // Get order
      const order = await Order.findById(payment.order);
      if (!order) {
        throw new Error('سفارش یافت نشد');
      }

      // Verify payment with gateway
      const verifyData = {
        authority: authority,
        amount: payment.amount,
        id: authority,
        order_id: order.orderNumber
      };

      const verifyResult = await gateway.verify(verifyData);

      // Update payment with callback data
      payment.transaction.callbackData = callbackData;

      if (verifyResult.success) {
        // Mark payment as completed
        await payment.markAsCompleted({
          transactionId: verifyResult.transactionId || verifyResult.refId,
          refId: verifyResult.refId,
          responseCode: 'SUCCESS',
          gatewayResponse: verifyResult.gatewayResponse
        });

        // Mark order as paid
        await OrderService.markOrderAsPaid(
          order._id,
          verifyResult.transactionId || verifyResult.refId,
          gatewayName,
          verifyResult.gatewayResponse
        );

        // Send payment success notification
        try {
          const { Notification } = await import('../notifications/model.js');
          await Notification.create({
            type: 'payment_success',
            title: {
              fa: 'پرداخت موفق',
              en: 'Payment Successful'
            },
            message: {
              fa: `پرداخت سفارش ${order.orderNumber} با موفقیت انجام شد.`,
              en: `Payment for order ${order.orderNumber} was successful.`
            },
            recipient: payment.user,
            relatedEntity: {
              type: 'order',
              id: order._id
            },
            priority: 'normal',
            actionUrl: `/orders/${order._id}`
          });
        } catch (notificationError) {
          logger.error('Failed to send payment success notification:', notificationError);
        }

        logger.info(`Payment verified: ${payment.paymentNumber}, order: ${order.orderNumber}`);

        return {
          success: true,
          payment,
          order,
          redirectUrl: `${process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : (process.env.FRONTEND_URL || 'http://localhost:3000')}/orders/${order._id}/success`
        };
      } else {
        // Mark payment as failed
        await payment.markAsFailed(verifyResult.error);

        logger.error(`Payment verification failed: ${payment.paymentNumber}, error: ${verifyResult.error.message}`);

        return {
          success: false,
          payment,
          error: verifyResult.error,
          redirectUrl: `${process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : (process.env.FRONTEND_URL || 'http://localhost:3000')}/orders/${order._id}/failed`
        };
      }
    } catch (error) {
      logger.error('Verify payment error:', error);
      throw error;
    }
  }

  /**
   * Get payment by ID
   * @param {string} paymentId - Payment ID
   * @param {string} userId - User ID (optional, for ownership check)
   * @returns {Promise<Payment>} Payment document
   */
  static async getPaymentById(paymentId, userId = null) {
    try {
      const query = { _id: paymentId, deletedAt: null };
      
      if (userId) {
        query.user = userId;
      }

      const payment = await Payment.findOne(query)
        .populate('order')
        .populate('user', 'name email phoneNumber');

      if (!payment) {
        throw new Error('پرداخت یافت نشد');
      }

      return payment;
    } catch (error) {
      logger.error('Get payment by ID error:', error);
      throw error;
    }
  }

  /**
   * Get payments by order
   * @param {string} orderId - Order ID
   * @returns {Promise<Payment>} Payment document
   */
  static async getPaymentByOrder(orderId) {
    try {
      const payment = await Payment.findByOrder(orderId);

      if (!payment) {
        throw new Error('پرداخت یافت نشد');
      }

      return payment;
    } catch (error) {
      logger.error('Get payment by order error:', error);
      throw error;
    }
  }

  /**
   * Get user payments
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Payments and pagination
   */
  static async getUserPayments(userId, options = {}) {
    try {
      const page = parseInt(options.page) || 1;
      const limit = parseInt(options.limit) || 10;
      const skip = (page - 1) * limit;
      const status = options.status;

      const payments = await Payment.findByUser(userId, {
        status,
        limit,
        skip
      });

      const total = await Payment.countDocuments({
        user: userId,
        deletedAt: null,
        ...(status ? { status } : {})
      });

      return {
        payments,
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
      logger.error('Get user payments error:', error);
      throw error;
    }
  }

  /**
   * Refund payment
   * @param {string} paymentId - Payment ID
   * @param {string} userId - User ID (admin)
   * @param {Object} refundData - Refund data
   * @returns {Promise<Payment>} Refunded payment
   */
  static async refundPayment(paymentId, userId, refundData = {}) {
    try {
      const payment = await Payment.findById(paymentId);

      if (!payment) {
        throw new Error('پرداخت یافت نشد');
      }

      if (payment.status !== 'completed') {
        throw new Error('فقط پرداخت‌های موفق قابل بازگشت هستند');
      }

      // Get gateway
      const gateway = GatewayFactory.getGateway(payment.gateway);

      // Get order
      const order = await Order.findById(payment.order);
      if (!order) {
        throw new Error('سفارش یافت نشد');
      }

      // Refund via gateway
      const refundResult = await gateway.refund({
        id: payment.transaction.authority,
        order_id: order.orderNumber,
        amount: refundData.amount || payment.amount
      });

      if (refundResult.success) {
        // Mark payment as refunded
        await payment.processRefund({
          amount: refundData.amount || payment.amount,
          reason: refundData.reason,
          refundedBy: userId,
          transactionId: refundResult.transactionId,
          gatewayResponse: refundResult.gatewayResponse
        });

        // Update order payment status
        order.payment.status = 'refunded';
        await order.save();

        logger.info(`Payment refunded: ${payment.paymentNumber}`);

        return payment;
      } else {
        throw new Error(refundResult.error.message || 'خطا در بازگشت وجه');
      }
    } catch (error) {
      logger.error('Refund payment error:', error);
      throw error;
    }
  }
}

