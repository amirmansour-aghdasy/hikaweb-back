import { ShippingAddress, ShippingMethod } from './model.js';
import { Product } from '../products/model.js';
import { logger } from '../../utils/logger.js';

/**
 * ShippingService - Service layer for shipping operations
 * 
 * Features:
 * - Address management
 * - Shipping cost calculation
 * - Shipping method management
 */
export class ShippingService {
  /**
   * Create shipping address
   * @param {string} userId - User ID
   * @param {Object} addressData - Address data
   * @returns {Promise<ShippingAddress>} Created address
   */
  static async createAddress(userId, addressData) {
    try {
      const address = new ShippingAddress({
        user: userId,
        type: addressData.type || 'home',
        label: addressData.label || 'آدرس من',
        contactInfo: addressData.contactInfo,
        address: addressData.address,
        isDefault: addressData.isDefault || false
      });

      // If set as default, unset others
      if (address.isDefault) {
        await address.setAsDefault();
      } else {
        await address.save();
      }

      logger.info(`Shipping address created: ${address._id}, user: ${userId}`);
      return address;
    } catch (error) {
      logger.error('Create shipping address error:', error);
      throw error;
    }
  }

  /**
   * Get user addresses
   * @param {string} userId - User ID
   * @returns {Promise<Array<ShippingAddress>>} User addresses
   */
  static async getUserAddresses(userId) {
    try {
      const addresses = await ShippingAddress.findByUser(userId);
      return addresses;
    } catch (error) {
      logger.error('Get user addresses error:', error);
      throw error;
    }
  }

  /**
   * Get address by ID (with ownership check)
   * @param {string} addressId - Address ID
   * @param {string} userId - User ID
   * @returns {Promise<ShippingAddress>} Address document
   */
  static async getAddressById(addressId, userId) {
    try {
      const address = await ShippingAddress.findOne({
        _id: addressId,
        user: userId,
        deletedAt: null
      });

      if (!address) {
        throw new Error('آدرس یافت نشد');
      }

      return address;
    } catch (error) {
      logger.error('Get address by ID error:', error);
      throw error;
    }
  }

  /**
   * Update shipping address
   * @param {string} addressId - Address ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Update data
   * @returns {Promise<ShippingAddress>} Updated address
   */
  static async updateAddress(addressId, userId, updateData) {
    try {
      const address = await this.getAddressById(addressId, userId);

      // Update fields
      if (updateData.type) address.type = updateData.type;
      if (updateData.label) address.label = updateData.label;
      if (updateData.contactInfo) address.contactInfo = { ...address.contactInfo, ...updateData.contactInfo };
      if (updateData.address) address.address = { ...address.address, ...updateData.address };
      
      // Handle default address
      if (updateData.isDefault !== undefined) {
        address.isDefault = updateData.isDefault;
        if (updateData.isDefault) {
          await address.setAsDefault();
        } else {
          await address.save();
        }
      } else {
        await address.save();
      }

      logger.info(`Shipping address updated: ${addressId}, user: ${userId}`);
      return address;
    } catch (error) {
      logger.error('Update shipping address error:', error);
      throw error;
    }
  }

  /**
   * Delete shipping address
   * @param {string} addressId - Address ID
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  static async deleteAddress(addressId, userId) {
    try {
      const address = await this.getAddressById(addressId, userId);
      await address.softDelete(userId);

      logger.info(`Shipping address deleted: ${addressId}, user: ${userId}`);
    } catch (error) {
      logger.error('Delete shipping address error:', error);
      throw error;
    }
  }

  /**
   * Set address as default
   * @param {string} addressId - Address ID
   * @param {string} userId - User ID
   * @returns {Promise<ShippingAddress>} Updated address
   */
  static async setDefaultAddress(addressId, userId) {
    try {
      const address = await this.getAddressById(addressId, userId);
      await address.setAsDefault();

      logger.info(`Default address set: ${addressId}, user: ${userId}`);
      return address;
    } catch (error) {
      logger.error('Set default address error:', error);
      throw error;
    }
  }

  /**
   * Calculate shipping cost
   * @param {Object} calculationData - Calculation data
   * @param {string} methodName - Shipping method name
   * @param {Array} items - Order items (for weight calculation)
   * @param {number} orderTotal - Order total (for price-based calculation)
   * @param {Object} destination - Destination address (for distance calculation)
   * @returns {Promise<Object>} Shipping cost and method details
   */
  static async calculateShippingCost(methodName, items = [], orderTotal = 0, destination = null) {
    try {
      // Get shipping method
      const method = await ShippingMethod.findByName(methodName);

      if (!method) {
        throw new Error(`روش ارسال "${methodName}" یافت نشد یا غیرفعال است`);
      }

      if (!method.isEnabled || !method.isAvailable) {
        throw new Error(`روش ارسال "${methodName}" در حال حاضر در دسترس نیست`);
      }

      // Calculate total weight from items
      let totalWeight = 0;
      if (items.length > 0) {
        for (const item of items) {
          const product = await Product.findById(item.product);
          if (product && product.type === 'physical' && product.physicalProduct?.weight) {
            totalWeight += product.physicalProduct.weight * item.quantity;
          }
        }
      }

      // Calculate distance (if destination provided and method is distance-based)
      let distance = 0;
      if (destination && method.costCalculation.type === 'distance') {
        // TODO: Implement distance calculation using coordinates or postal code
        // For now, use a simple estimation based on province
        distance = this._estimateDistance(destination);
      }

      // Calculate cost
      const cost = method.calculateCost({
        weight: totalWeight,
        distance: distance,
        orderTotal: orderTotal
      });

      return {
        method: {
          name: method.name,
          displayName: method.displayName,
          description: method.description,
          estimatedDays: method.estimatedDays
        },
        cost: cost,
        calculation: {
          type: method.costCalculation.type,
          weight: totalWeight,
          distance: distance,
          orderTotal: orderTotal
        }
      };
    } catch (error) {
      logger.error('Calculate shipping cost error:', error);
      throw error;
    }
  }

  /**
   * Get available shipping methods
   * @returns {Promise<Array<ShippingMethod>>} Available methods
   */
  static async getAvailableMethods() {
    try {
      const methods = await ShippingMethod.findEnabled();
      return methods;
    } catch (error) {
      logger.error('Get available methods error:', error);
      throw error;
    }
  }

  /**
   * Get shipping method by name
   * @param {string} methodName - Method name
   * @returns {Promise<ShippingMethod>} Shipping method
   */
  static async getMethodByName(methodName) {
    try {
      const method = await ShippingMethod.findByName(methodName);

      if (!method) {
        throw new Error(`روش ارسال "${methodName}" یافت نشد`);
      }

      return method;
    } catch (error) {
      logger.error('Get method by name error:', error);
      throw error;
    }
  }

  /**
   * Estimate distance (simple implementation)
   * @private
   * @param {Object} destination - Destination address
   * @returns {number} Estimated distance in km
   */
  static _estimateDistance(destination) {
    // Simple estimation based on province
    // In production, use a proper geocoding service or distance API
    const provinceDistances = {
      'تهران': 0,
      'البرز': 30,
      'قزوین': 150,
      'اصفهان': 450,
      'شیراز': 900,
      'مشهد': 900,
      'تبریز': 600,
      'اهواز': 700
    };

    const province = destination.province || destination.address?.province || '';
    return provinceDistances[province] || 500; // Default: 500km
  }

  /**
   * Initialize default shipping methods (for first-time setup)
   * @returns {Promise<void>}
   */
  static async initializeDefaultMethods() {
    try {
      const defaultMethods = [
        {
          name: 'standard',
          displayName: { fa: 'پست پیشتاز', en: 'Standard Shipping' },
          description: { fa: 'ارسال استاندارد در 3-5 روز کاری', en: 'Standard shipping in 3-5 business days' },
          costCalculation: {
            type: 'fixed',
            fixedCost: 50000,
            minCost: 30000,
            maxCost: 200000
          },
          estimatedDays: { min: 3, max: 5 },
          isAvailable: true,
          isEnabled: true
        },
        {
          name: 'express',
          displayName: { fa: 'پست سریع', en: 'Express Shipping' },
          description: { fa: 'ارسال سریع در 1-2 روز کاری', en: 'Express shipping in 1-2 business days' },
          costCalculation: {
            type: 'fixed',
            fixedCost: 100000,
            minCost: 50000,
            maxCost: 300000
          },
          estimatedDays: { min: 1, max: 2 },
          isAvailable: true,
          isEnabled: true
        },
        {
          name: 'pickup',
          displayName: { fa: 'تحویل در محل', en: 'Pickup' },
          description: { fa: 'دریافت از دفتر هیکاوب', en: 'Pickup from Hikaweb office' },
          costCalculation: {
            type: 'fixed',
            fixedCost: 0
          },
          estimatedDays: { min: 0, max: 0 },
          isAvailable: true,
          isEnabled: true
        }
      ];

      for (const methodData of defaultMethods) {
        const existing = await ShippingMethod.findOne({ name: methodData.name });
        if (!existing) {
          await ShippingMethod.create(methodData);
          logger.info(`Default shipping method created: ${methodData.name}`);
        }
      }
    } catch (error) {
      logger.error('Initialize default methods error:', error);
      throw error;
    }
  }
}

