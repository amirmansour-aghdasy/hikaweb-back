import { ZarinpalGateway } from './zarinpal.js';
import { IDPayGateway } from './idpay.js';
import { logger } from '../../../utils/logger.js';
import { config } from '../../../config/environment.js';

/**
 * Payment Gateway Factory
 * 
 * Creates and returns the appropriate gateway instance
 */
export class GatewayFactory {
  /**
   * Get gateway instance
   * @param {string} gatewayName - Gateway name (zarinpal, idpay)
   * @returns {BaseGateway} Gateway instance
   */
  static getGateway(gatewayName = 'zarinpal') {
    const gatewayConfig = this.getGatewayConfig(gatewayName);
    
    switch (gatewayName.toLowerCase()) {
      case 'zarinpal':
        return new ZarinpalGateway(gatewayConfig);
      
      case 'idpay':
        return new IDPayGateway(gatewayConfig);
      
      default:
        logger.warn(`Unknown gateway: ${gatewayName}, using Zarinpal`);
        return new ZarinpalGateway(this.getGatewayConfig('zarinpal'));
    }
  }

  /**
   * Get gateway configuration from environment
   * @param {string} gatewayName - Gateway name
   * @returns {Object} Gateway configuration
   */
  static getGatewayConfig(gatewayName) {
    const gatewayNameUpper = gatewayName.toUpperCase();
    
    switch (gatewayName.toLowerCase()) {
      case 'zarinpal':
        return {
          merchantId: process.env.ZARINPAL_MERCHANT_ID || '',
          accessToken: process.env.ZARINPAL_ACCESS_TOKEN || '', // Bearer token for API v4
          sandbox: process.env.ZARINPAL_SANDBOX === 'true' || config.NODE_ENV !== 'production'
        };
      
      case 'idpay':
        return {
          apiKey: process.env.IDPAY_API_KEY || '',
          sandbox: process.env.IDPAY_SANDBOX === 'true' || config.NODE_ENV !== 'production'
        };
      
      default:
        return {
          merchantId: '',
          sandbox: true
        };
    }
  }

  /**
   * Get available gateways
   * @returns {Array<string>} List of available gateway names
   */
  static getAvailableGateways() {
    const gateways = [];
    
    // Zarinpal is available if either merchant ID or access token is provided
    if (process.env.ZARINPAL_MERCHANT_ID || process.env.ZARINPAL_ACCESS_TOKEN) {
      gateways.push('zarinpal');
    }
    
    if (process.env.IDPAY_API_KEY) {
      gateways.push('idpay');
    }
    
    return gateways;
  }
}

export { ZarinpalGateway, IDPayGateway };

