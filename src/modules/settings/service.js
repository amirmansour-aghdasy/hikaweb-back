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

      // Deep merge nested objects
      Object.keys(updateData).forEach(key => {
        if (
          typeof updateData[key] === 'object' &&
          updateData[key] !== null &&
          !Array.isArray(updateData[key])
        ) {
          settings[key] = { ...settings[key], ...updateData[key] };
        } else {
          settings[key] = updateData[key];
        }
      });

      settings.updatedBy = userId;
      await settings.save();

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
        }
      };
    } catch (error) {
      logger.error('Get public settings error:', error);
      throw error;
    }
  }
}
