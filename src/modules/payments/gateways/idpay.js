import axios from 'axios';
import crypto from 'crypto';
import { BaseGateway } from './baseGateway.js';
import { logger } from '../../../utils/logger.js';

/**
 * IDPay Payment Gateway
 * 
 * Documentation: https://idpay.ir/web-service/
 */
export class IDPayGateway extends BaseGateway {
  constructor(config) {
    super(config);
    this.name = 'idpay';
    this.apiKey = config.apiKey;
    this.sandbox = config.sandbox || false;
    this.baseUrl = this.sandbox
      ? 'https://api.sandbox.idpay.ir/v1.1'
      : 'https://api.idpay.ir/v1.1';
  }

  /**
   * Initialize payment request
   * @param {Object} paymentData - Payment data
   * @param {number} paymentData.amount - Amount in Toman
   * @param {string} paymentData.description - Payment description
   * @param {string} paymentData.callbackUrl - Callback URL
   * @param {Object} paymentData.metadata - Additional metadata
   * @returns {Promise<Object>} Payment initialization result
   */
  async initialize(paymentData) {
    try {
      const { amount, description, callbackUrl, metadata } = paymentData;

      const requestData = {
        order_id: paymentData.orderId || Date.now().toString(),
        amount: amount,
        name: metadata?.name || '',
        phone: metadata?.phone || '',
        mail: metadata?.email || '',
        desc: description || 'پرداخت سفارش',
        callback: callbackUrl
      };

      const response = await axios.post(
        `${this.baseUrl}/payment`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': this.apiKey,
            'X-SANDBOX': this.sandbox ? '1' : '0'
          }
        }
      );

      if (response.data.id) {
        const redirectUrl = response.data.link;

        return {
          success: true,
          authority: response.data.id,
          redirectUrl: redirectUrl,
          gatewayResponse: response.data
        };
      } else {
        const errorCode = response.data.error_code;
        const errorMessage = response.data.error_message || 'خطا در اتصال به درگاه پرداخت';
        
        logger.error('IDPay initialize error:', {
          code: errorCode,
          message: errorMessage,
          response: response.data
        });

        return {
          success: false,
          error: {
            code: errorCode?.toString() || 'UNKNOWN',
            message: errorMessage
          }
        };
      }
    } catch (error) {
      logger.error('IDPay initialize exception:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        ...(error.response && {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        })
      });
      
      let errorMessage = 'خطا در اتصال به درگاه پرداخت';
      if (error.response?.data?.error_message) {
        errorMessage = error.response.data.error_message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: {
          code: 'EXCEPTION',
          message: errorMessage
        }
      };
    }
  }

  /**
   * Verify payment
   * @param {Object} verifyData - Verification data
   * @param {string} verifyData.id - Payment ID (authority)
   * @param {string} verifyData.order_id - Order ID
   * @returns {Promise<Object>} Verification result
   */
  async verify(verifyData) {
    try {
      const { id, order_id } = verifyData;

      const requestData = {
        id: id,
        order_id: order_id
      };

      const response = await axios.post(
        `${this.baseUrl}/payment/verify`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': this.apiKey,
            'X-SANDBOX': this.sandbox ? '1' : '0'
          }
        }
      );

      if (response.data.status === 100) {
        return {
          success: true,
          transactionId: response.data.id?.toString(),
          refId: response.data.track_id?.toString(),
          cardNo: response.data.payment?.card_no,
          hashedCardNo: response.data.payment?.hashed_card_no,
          gatewayResponse: response.data
        };
      } else {
        const errorCode = response.data.status;
        const errorMessage = response.data.error_message || 'پرداخت ناموفق بود';
        
        logger.error('IDPay verify error:', {
          code: errorCode,
          message: errorMessage,
          response: response.data
        });

        return {
          success: false,
          error: {
            code: errorCode?.toString() || 'UNKNOWN',
            message: errorMessage
          },
          gatewayResponse: response.data
        };
      }
    } catch (error) {
      logger.error('IDPay verify exception:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        ...(error.response && {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        })
      });
      
      let errorMessage = 'خطا در تایید پرداخت';
      if (error.response?.data?.error_message) {
        errorMessage = error.response.data.error_message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: {
          code: 'EXCEPTION',
          message: errorMessage
        }
      };
    }
  }

  /**
   * Refund payment
   * @param {Object} refundData - Refund data
   * @param {string} refundData.id - Payment ID
   * @param {string} refundData.order_id - Order ID
   * @returns {Promise<Object>} Refund result
   */
  async refund(refundData) {
    try {
      const { id, order_id } = refundData;

      const requestData = {
        id: id,
        order_id: order_id
      };

      const response = await axios.post(
        `${this.baseUrl}/payment/refund`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': this.apiKey,
            'X-SANDBOX': this.sandbox ? '1' : '0'
          }
        }
      );

      if (response.data.status === 100) {
        return {
          success: true,
          gatewayResponse: response.data
        };
      } else {
        return {
          success: false,
          error: {
            code: response.data.status?.toString() || 'UNKNOWN',
            message: response.data.error_message || 'خطا در بازگشت وجه'
          },
          gatewayResponse: response.data
        };
      }
    } catch (error) {
      logger.error('IDPay refund exception:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        ...(error.response && {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        })
      });
      return {
        success: false,
        error: {
          code: 'EXCEPTION',
          message: error.message || 'خطا در بازگشت وجه'
        }
      };
    }
  }

  /**
   * Get payment status
   * @param {string} id - Payment ID
   * @param {string} order_id - Order ID
   * @returns {Promise<Object>} Payment status
   */
  async getStatus(id, order_id) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/payment/inquiry`,
        {
          id: id,
          order_id: order_id
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': this.apiKey,
            'X-SANDBOX': this.sandbox ? '1' : '0'
          }
        }
      );

      return {
        success: true,
        status: response.data.status,
        gatewayResponse: response.data
      };
    } catch (error) {
      logger.error('IDPay getStatus exception:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        ...(error.response && {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        })
      });
      return {
        success: false,
        error: {
          code: 'EXCEPTION',
          message: error.message || 'خطا در دریافت وضعیت پرداخت'
        }
      };
    }
  }

  /**
   * Validate callback data
   * @param {Object} callbackData - Callback data from gateway
   * @returns {boolean} Is valid
   */
  validateCallback(callbackData) {
    // IDPay sends id and status in callback
    return !!callbackData.id && !!callbackData.status;
  }
}

