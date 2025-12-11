import { Settings } from './model.js';
import { logger } from '../../utils/logger.js';

export class SettingsService {
  static async getSettings() {
    try {
      const settings = await Settings.getInstance();
      return settings;
    } catch (error) {
      logger.error('Get settings error:', error);
      throw error;
    }
  }

  static async updateSettings(updateData, userId) {
    try {
      const settings = await Settings.getInstance();

      // Helper function to remove undefined values from an object recursively
      const removeUndefined = (obj) => {
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
          return obj;
        }
        
        const cleaned = {};
        Object.keys(obj).forEach(key => {
          if (obj[key] !== undefined) {
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
              cleaned[key] = removeUndefined(obj[key]);
            } else {
              cleaned[key] = obj[key];
            }
          }
        });
        return cleaned;
      };

      // Helper function to deep merge objects, only updating defined fields
      // This ensures that undefined values in nested objects don't overwrite existing values
      const deepMerge = (target, source) => {
        if (typeof source !== 'object' || source === null || Array.isArray(source)) {
          return source;
        }
        
        // If target is not an object, just return source
        if (typeof target !== 'object' || target === null || Array.isArray(target)) {
          return source;
        }
        
        // Convert target to plain object if it's a Mongoose document
        // This ensures we can properly check for undefined values
        const targetObj = target.toObject ? target.toObject() : target;
        
        // Start with a clean object, only including defined values from target
        const result = {};
        
        // First, copy only defined values from target (after removing undefined)
        const cleanedTarget = removeUndefined(targetObj);
        Object.keys(cleanedTarget).forEach(key => {
          result[key] = cleanedTarget[key];
        });
        
        // Then, merge defined values from source
        Object.keys(source).forEach(key => {
          // Only process defined (non-undefined) values
          if (source[key] !== undefined) {
            // Handle arrays - replace entirely (don't merge arrays)
            if (Array.isArray(source[key])) {
              result[key] = source[key];
            } else if (
              typeof source[key] === 'object' &&
              source[key] !== null &&
              typeof result[key] === 'object' &&
              result[key] !== null &&
              !Array.isArray(result[key])
            ) {
              // Recursively merge nested objects
              result[key] = deepMerge(result[key], source[key]);
            } else {
              // Assign non-object values directly
              result[key] = source[key];
            }
          }
          // If source[key] is undefined, we don't include it in result
        });
        
        return result;
      };

      // Clean updateData from undefined values
      const cleanedUpdateData = removeUndefined(updateData);
      
      // Debug log for whatsapp updates
      if (cleanedUpdateData.whatsapp) {
        logger.info('Updating WhatsApp settings:', JSON.stringify(cleanedUpdateData.whatsapp, null, 2));
      }

      // Deep merge nested objects - only update fields that are present in updateData
      Object.keys(cleanedUpdateData).forEach(key => {
        if (
          typeof cleanedUpdateData[key] === 'object' &&
          cleanedUpdateData[key] !== null &&
          !Array.isArray(cleanedUpdateData[key])
        ) {
          // Deep merge to preserve existing nested fields
          // Only merge if target exists, otherwise just assign
          if (settings[key] && typeof settings[key] === 'object' && !Array.isArray(settings[key])) {
            // deepMerge already handles undefined values, so no need for additional cleanup
            const merged = deepMerge(settings[key], cleanedUpdateData[key]);
            settings[key] = merged;
            // Mark the nested path as modified so Mongoose knows to save it
            // For nested objects, we need to mark the full path
            settings.markModified(key);
            // Also mark nested paths if they exist (e.g., whatsapp.config, whatsapp.agents)
            if (key === 'whatsapp' && cleanedUpdateData.whatsapp) {
              if (cleanedUpdateData.whatsapp.config) {
                settings.markModified('whatsapp.config');
              }
              if (cleanedUpdateData.whatsapp.agents) {
                settings.markModified('whatsapp.agents');
              }
            }
          } else {
            settings[key] = cleanedUpdateData[key];
            settings.markModified(key);
          }
        } else if (Array.isArray(cleanedUpdateData[key])) {
          // For arrays, replace the entire array (don't merge)
          settings[key] = cleanedUpdateData[key];
          settings.markModified(key);
        } else {
          settings[key] = cleanedUpdateData[key];
        }
      });

      settings.updatedBy = userId;
      
      // Debug log before save
      if (cleanedUpdateData.whatsapp) {
        logger.info('WhatsApp settings before save:', JSON.stringify(settings.whatsapp, null, 2));
      }
      
      await settings.save();
      
      // Debug log after save
      if (cleanedUpdateData.whatsapp) {
        logger.info('WhatsApp settings after save:', JSON.stringify(settings.whatsapp, null, 2));
      }

      logger.info(`Settings updated by user ${userId}`);
      return settings;
    } catch (error) {
      logger.error('Settings update error:', error);
      throw error;
    }
  }

  static async getPublicSettings() {
    try {
      const settings = await Settings.getInstance();

      // Return only public settings
      return {
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        logo: settings.logo,
        contact: {
          email: settings.contact?.email,
          phone: settings.contact?.phone,
          address: settings.contact?.address,
          workingHours: settings.contact?.workingHours
        },
        socialMedia: settings.socialMedia,
        business: {
          companyName: settings.business?.companyName,
          businessHours: settings.business?.businessHours
        },
        whatsapp: settings.whatsapp || {
          enabled: false,
          agents: [],
          config: {
            position: 'bottom-right',
            showPulse: true,
            size: 'medium',
            collectUserInfo: false,
            showOnPages: [],
            hideOnPages: [],
            offlineMode: 'message',
            language: 'fa',
            autoCloseTimer: 0,
            notificationBadge: null
          }
        },
        maintenanceMode: settings.system?.maintenanceMode || {
          enabled: false,
          message: { fa: '', en: '' }
        }
      };
    } catch (error) {
      logger.error('Get public settings error:', error);
      throw error;
    }
  }

  static async getMaintenanceStatus() {
    try {
      const settings = await Settings.getInstance();
      return {
        enabled: settings.system?.maintenanceMode?.enabled || false,
        message: settings.system?.maintenanceMode?.message || {
          fa: 'سایت در حال تعمیر و نگهداری است. لطفاً بعداً مراجعه کنید.',
          en: 'Site is under maintenance. Please check back later.'
        },
        allowedIPs: settings.system?.maintenanceMode?.allowedIPs || []
      };
    } catch (error) {
      logger.error('Get maintenance status error:', error);
      throw error;
    }
  }
}
