import axios from 'axios';
import { BaseGateway } from './baseGateway.js';
import { logger } from '../../../utils/logger.js';

/** User-friendly Persian messages for known Zarinpal error codes */
const ZARINPAL_ERROR_MESSAGES = {
  [-9]: 'حداقل مبلغ پرداخت ۱٬۰۰۰ تومان است.',
  [-12]: 'تعداد درخواست‌ها زیاد است. لطفاً چند دقیقه دیگر دوباره تلاش کنید.'
};

/**
 * Zarinpal Payment Gateway
 *
 * Documentation: https://docs.zarinpal.com/
 */
export class ZarinpalGateway extends BaseGateway {
  constructor(config) {
    super(config);
    this.name = 'zarinpal';
    this.merchantId = config.merchantId;
    this.accessToken = config.accessToken; // Bearer token for API v4
    this.sandbox = config.sandbox || false;
    // Zarinpal API v4 base URLs
    // According to official Zarinpal API v4 documentation:
    // Production: https://payment.zarinpal.com/pg/v4/payment/request.json
    // Sandbox: https://sandbox.zarinpal.com/pg/v4/payment/request.json
    // Documentation: https://www.zarinpal.com/docs/paymentGateway/connectToGateway.html
    // Note: API v4 uses /pg/v4 prefix and .json extension
    this.baseUrl = this.sandbox
      ? 'https://sandbox.zarinpal.com/pg'
      : 'https://payment.zarinpal.com/pg';
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

      // Validate configuration
      if (!this.merchantId && !this.accessToken) {
        const error = new Error('Zarinpal configuration error: Either ZARINPAL_MERCHANT_ID or ZARINPAL_ACCESS_TOKEN must be provided');
        logger.error('Zarinpal configuration validation failed (initialize):', {
          hasMerchantId: !!this.merchantId,
          hasAccessToken: !!this.accessToken,
          sandbox: this.sandbox
        });
        throw error;
      }
      
      // If using Bearer token, merchant_id is still required in request body
      if (this.accessToken && !this.merchantId) {
        const error = new Error('Zarinpal configuration error: ZARINPAL_MERCHANT_ID is required when using ZARINPAL_ACCESS_TOKEN');
        logger.error('Zarinpal configuration validation failed (initialize):', {
          hasMerchantId: !!this.merchantId,
          hasAccessToken: !!this.accessToken,
          sandbox: this.sandbox
        });
        throw error;
      }
      
      // Log configuration (without sensitive data)
      logger.info('Zarinpal initialize configuration:', {
        hasMerchantId: !!this.merchantId,
        merchantIdLength: this.merchantId?.length || 0,
        hasAccessToken: !!this.accessToken,
        accessTokenLength: this.accessToken?.length || 0,
        sandbox: this.sandbox,
        baseUrl: this.baseUrl
      });

      const requestData = {
        merchant_id: this.merchantId,
        amount: amount,
        description: description || 'پرداخت سفارش',
        callback_url: callbackUrl,
        metadata: {
          mobile: metadata?.phone || null,
          email: metadata?.email || null
        }
      };

      // Prepare headers - use Bearer token if available
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      // If access token is provided, use Bearer authentication (API v4)
      // Note: merchant_id is still required in request body even with Bearer token
      // Ensure accessToken doesn't already have "Bearer " prefix
      if (this.accessToken) {
        const token = this.accessToken.trim();
        headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      }

      // Use correct endpoint for API v4: /v4/payment/request.json
      // Full URL: https://payment.zarinpal.com/pg/v4/payment/request.json
      // Full URL (Sandbox): https://sandbox.zarinpal.com/pg/v4/payment/request.json
      // Documentation: https://www.zarinpal.com/docs/paymentGateway/connectToGateway.html
      const endpoint = '/v4/payment/request.json';
      const fullUrl = `${this.baseUrl}${endpoint}`;
      
      logger.info('Zarinpal payment request:', {
        url: fullUrl,
        sandbox: this.sandbox,
        merchantId: this.merchantId ? '***' : 'missing',
        hasToken: !!this.accessToken,
        amount: amount,
        requestData: {
          merchant_id: this.merchantId ? '***' : 'missing',
          amount: amount,
          description: description || 'پرداخت سفارش',
          callback_url: callbackUrl
        }
      });
      
      const response = await axios.post(
        fullUrl,
        requestData,
        { headers }
      );

      // Check if response is HTML (wrong URL) instead of JSON
      if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
        logger.error('Zarinpal returned HTML instead of JSON - URL may be incorrect:', {
          url: fullUrl,
          responsePreview: response.data.substring(0, 200)
        });
        return {
          success: false,
          error: {
            code: 'INVALID_URL',
            message: 'URL درگاه پرداخت صحیح نیست. لطفاً با پشتیبانی تماس بگیرید.'
          }
        };
      }

      // Check if response.data is an object (JSON)
      if (typeof response.data !== 'object' || response.data === null) {
        logger.error('Zarinpal returned invalid response format:', {
          url: fullUrl,
          responseType: typeof response.data,
          responsePreview: typeof response.data === 'string' ? response.data.substring(0, 200) : String(response.data)
        });
        return {
          success: false,
          error: {
            code: 'INVALID_RESPONSE',
            message: 'پاسخ نامعتبر از درگاه پرداخت دریافت شد.'
          }
        };
      }

      // Log full response for debugging
      logger.info('Zarinpal initialize response:', {
        sandbox: this.sandbox,
        hasData: !!response.data.data,
        code: response.data.data?.code,
        hasAuthority: !!response.data.data?.authority,
        authority: response.data.data?.authority,
        hasErrors: Array.isArray(response.data.errors) ? response.data.errors.length > 0 : !!response.data.errors,
        fullResponse: response.data
      });

      if (response.data.data && response.data.data.code === 100) {
        const authority = response.data.data.authority;
        
        if (!authority) {
          logger.error('Zarinpal returned success but no authority:', {
            response: response.data
          });
          return {
            success: false,
            error: {
              code: 'MISSING_AUTHORITY',
              message: 'درگاه پرداخت Authority برنگرداند'
            }
          };
        }
        
        // Redirect URL according to official documentation:
        // https://www.zarinpal.com/docs/paymentGateway/connectToGateway.html
        // Production: https://payment.zarinpal.com/pg/StartPay/{authority}
        // Sandbox: https://sandbox.zarinpal.com/pg/StartPay/{authority}
        const redirectUrl = this.sandbox
          ? `https://sandbox.zarinpal.com/pg/StartPay/${authority}`
          : `https://payment.zarinpal.com/pg/StartPay/${authority}`;

        logger.info('Zarinpal redirect URL generated:', {
          authority: authority,
          redirectUrl: redirectUrl,
          sandbox: this.sandbox
        });

        return {
          success: true,
          authority: authority,
          redirectUrl: redirectUrl,
          gatewayResponse: response.data
        };
      } else {
        const errorCode = response.data.errors?.code ?? response.data.data?.code;
        const rawMessage = response.data.errors?.message || response.data.data?.message || '';
        const errorMessage = ZARINPAL_ERROR_MESSAGES[errorCode] ?? (rawMessage || 'خطا در اتصال به درگاه پرداخت');

        logger.error('Zarinpal initialize error:', {
          code: errorCode,
          message: rawMessage,
          response: response.data
        });

        return {
          success: false,
          error: {
            code: (errorCode != null ? errorCode : 'UNKNOWN').toString(),
            message: errorMessage
          }
        };
      }
    } catch (error) {
      logger.error('Zarinpal initialize exception:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        ...(error.response && {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        })
      });
      
      // Extract error message from Zarinpal response; prefer user-friendly Persian for known codes
      const gatewayCode = error.response?.data?.errors?.code;
      let errorMessage = ZARINPAL_ERROR_MESSAGES[gatewayCode]
        ?? error.response?.data?.errors?.message
        ?? error.response?.data?.message
        ?? (error.message && !error.message.includes('status code') ? error.message : null)
        ?? 'خطا در اتصال به درگاه پرداخت';

      return {
        success: false,
        error: {
          code: (gatewayCode != null ? gatewayCode : error.code ?? 'EXCEPTION').toString(),
          message: errorMessage
        }
      };
    }
  }

  /**
   * Verify payment
   * @param {Object} verifyData - Verification data
   * @param {string} verifyData.authority - Payment authority
   * @param {number} verifyData.amount - Payment amount
   * @returns {Promise<Object>} Verification result
   */
  async verify(verifyData) {
    try {
      const { authority, amount } = verifyData;

      // Validate configuration
      if (!this.merchantId && !this.accessToken) {
        throw new Error('Zarinpal configuration error: Either ZARINPAL_MERCHANT_ID or ZARINPAL_ACCESS_TOKEN must be provided');
      }
      
      // If using Bearer token, merchant_id is still required in request body
      if (this.accessToken && !this.merchantId) {
        throw new Error('Zarinpal configuration error: ZARINPAL_MERCHANT_ID is required when using ZARINPAL_ACCESS_TOKEN');
      }

      const requestData = {
        merchant_id: this.merchantId,
        authority: authority,
        amount: amount
      };

      // Prepare headers - use Bearer token if available
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      // If access token is provided, use Bearer authentication (API v4)
      // Note: merchant_id is still required in request body even with Bearer token
      // Ensure accessToken doesn't already have "Bearer " prefix
      if (this.accessToken) {
        const token = this.accessToken.trim();
        headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      }

      // Use correct endpoint for API v4: /v4/payment/verify.json
      // Full URL: https://payment.zarinpal.com/pg/v4/payment/verify.json
      // Full URL (Sandbox): https://sandbox.zarinpal.com/pg/v4/payment/verify.json
      // Documentation: https://www.zarinpal.com/docs/paymentGateway/connectToGateway.html
      const endpoint = '/v4/payment/verify.json';
      const fullUrl = `${this.baseUrl}${endpoint}`;
      
      logger.info('Zarinpal payment verify:', {
        url: fullUrl,
        sandbox: this.sandbox,
        merchantId: this.merchantId ? '***' : 'missing',
        hasToken: !!this.accessToken,
        authority: authority
      });
      
      const response = await axios.post(
        fullUrl,
        requestData,
        { headers }
      );

      // Check if response is HTML (wrong URL) instead of JSON
      if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
        logger.error('Zarinpal returned HTML instead of JSON - URL may be incorrect:', {
          url: fullUrl,
          responsePreview: response.data.substring(0, 200)
        });
        return {
          success: false,
          error: {
            code: 'INVALID_URL',
            message: 'URL درگاه پرداخت صحیح نیست. لطفاً با پشتیبانی تماس بگیرید.'
          }
        };
      }

      // Check if response.data is an object (JSON)
      if (typeof response.data !== 'object' || response.data === null) {
        logger.error('Zarinpal returned invalid response format:', {
          url: fullUrl,
          responseType: typeof response.data,
          responsePreview: typeof response.data === 'string' ? response.data.substring(0, 200) : String(response.data)
        });
        return {
          success: false,
          error: {
            code: 'INVALID_RESPONSE',
            message: 'پاسخ نامعتبر از درگاه پرداخت دریافت شد.'
          }
        };
      }

      // Log full response for debugging
      logger.info('Zarinpal verify response:', {
        sandbox: this.sandbox,
        hasData: !!response.data.data,
        code: response.data.data?.code,
        hasErrors: Array.isArray(response.data.errors) ? response.data.errors.length > 0 : !!response.data.errors,
        errorsCount: Array.isArray(response.data.errors) ? response.data.errors.length : 0,
        errorsCode: response.data.errors?.code,
        errorsMessage: response.data.errors?.message,
        fullResponse: response.data
      });

      // Check for success (code 100) or already verified (code 101)
      const responseCode = response.data.data?.code;
      if (responseCode === 100 || responseCode === 101) {
        // Code 100: Payment verified successfully
        // Code 101: Payment already verified (also success)
        logger.info('Zarinpal verify success:', {
          code: responseCode,
          refId: response.data.data.ref_id,
          sandbox: this.sandbox
        });
        
        return {
          success: true,
          transactionId: response.data.data.ref_id?.toString(),
          refId: response.data.data.ref_id?.toString(),
          cardHash: response.data.data.card_hash,
          cardPan: response.data.data.card_pan,
          gatewayResponse: response.data
        };
      } else {
        const errorCode = response.data.errors?.code || response.data.data?.code;
        const errorMessage = response.data.errors?.message || response.data.data?.message || 'پرداخت ناموفق بود';
        
        logger.error('Zarinpal verify error:', {
          code: errorCode,
          message: errorMessage,
          sandbox: this.sandbox,
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
      logger.error('Zarinpal verify exception:', {
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
          message: error.message || 'خطا در تایید پرداخت'
        }
      };
    }
  }

  /**
   * Refund payment (if supported)
   * @param {Object} refundData - Refund data
   * @returns {Promise<Object>} Refund result
   */
  async refund(refundData) {
    // Zarinpal refund requires special API access
    // This is a placeholder for future implementation
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Refund is not supported for this gateway'
      }
    };
  }

  /**
   * Get payment status
   * @param {string} authority - Payment authority
   * @returns {Promise<Object>} Payment status
   */
  async getStatus(authority) {
    // Zarinpal doesn't have a direct status check API
    // Verification is done via verify endpoint
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Status check is not supported for this gateway'
      }
    };
  }

  /**
   * Validate callback data
   * @param {Object} callbackData - Callback data from gateway
   * @returns {boolean} Is valid
   */
  validateCallback(callbackData) {
    // Zarinpal sends Status and Authority in callback
    return callbackData.Status === 'OK' && !!callbackData.Authority;
  }
}

