/**
 * Base Payment Gateway Class
 * 
 * All payment gateways should extend this class
 */
export class BaseGateway {
  constructor(config) {
    this.config = config;
    this.name = 'base';
  }

  /**
   * Initialize payment request
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Payment initialization result
   */
  async initialize(paymentData) {
    throw new Error('initialize method must be implemented');
  }

  /**
   * Verify payment
   * @param {Object} verifyData - Verification data
   * @returns {Promise<Object>} Verification result
   */
  async verify(verifyData) {
    throw new Error('verify method must be implemented');
  }

  /**
   * Refund payment
   * @param {Object} refundData - Refund data
   * @returns {Promise<Object>} Refund result
   */
  async refund(refundData) {
    throw new Error('refund method must be implemented');
  }

  /**
   * Get payment status
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} Payment status
   */
  async getStatus(transactionId) {
    throw new Error('getStatus method must be implemented');
  }

  /**
   * Validate callback data
   * @param {Object} callbackData - Callback data from gateway
   * @returns {boolean} Is valid
   */
  validateCallback(callbackData) {
    throw new Error('validateCallback method must be implemented');
  }
}

