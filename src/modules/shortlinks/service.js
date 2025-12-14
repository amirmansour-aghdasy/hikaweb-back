import ShortLink from './model.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/appError.js';
import { HTTP_STATUS } from '../../utils/httpStatus.js';
import crypto from 'crypto';

export class ShortLinkService {
  /**
   * Generate a unique short code
   */
  static async generateShortCode(length = 6, customCode = null) {
    if (customCode) {
      const exists = await ShortLink.findOne({ shortCode: customCode.toLowerCase() });
      if (exists) {
        throw new AppError('کد کوتاه قبلاً استفاده شده است', HTTP_STATUS.CONFLICT);
      }
      return customCode.toLowerCase();
    }

    // Generate random code
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = '';
      for (let i = 0; i < length; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      attempts++;
      
      if (attempts > maxAttempts) {
        // If too many attempts, increase length
        length++;
        attempts = 0;
      }
    } while (await ShortLink.findOne({ shortCode: code }));

    return code;
  }

  /**
   * Create a short link
   */
  static async createShortLink(data, userId = null) {
    try {
      const { originalUrl, resourceType, resourceId, shortCode, expiresAt, metadata } = data;

      // Generate short code if not provided
      const code = await this.generateShortCode(6, shortCode);

      // Create short link
      const shortLink = new ShortLink({
        shortCode: code,
        originalUrl,
        resourceType: resourceType || 'other',
        resourceId: resourceId || null,
        expiresAt: expiresAt || null,
        metadata: metadata || {},
        createdBy: userId || null
      });

      await shortLink.save();
      
      logger.info(`Short link created: ${code} -> ${originalUrl}`);
      return shortLink;
    } catch (error) {
      logger.error('Error creating short link:', error);
      throw error;
    }
  }

  /**
   * Get or create short link for a resource
   */
  static async getOrCreateShortLink(originalUrl, resourceType = null, resourceId = null, userId = null) {
    try {
      // Check if short link already exists for this resource
      if (resourceType && resourceId) {
        const existing = await ShortLink.findOne({
          resourceType,
          resourceId,
          isActive: true,
          $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
          ]
        });

        if (existing) {
          return existing;
        }
      }

      // Check if short link exists for this URL
      const existingByUrl = await ShortLink.findOne({
        originalUrl,
        isActive: true,
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      });

      if (existingByUrl) {
        return existingByUrl;
      }

      // Create new short link
      return await this.createShortLink({
        originalUrl,
        resourceType: resourceType || 'other',
        resourceId: resourceId || null
      }, userId);
    } catch (error) {
      logger.error('Error getting or creating short link:', error);
      throw error;
    }
  }

  /**
   * Get short link by code and redirect
   */
  static async getShortLinkByCode(shortCode) {
    try {
      const shortLink = await ShortLink.findOne({
        shortCode: shortCode.toLowerCase(),
        isActive: true
      });

      if (!shortLink) {
        throw new AppError('لینک کوتاه یافت نشد', HTTP_STATUS.NOT_FOUND);
      }

      // Check if expired
      if (shortLink.expiresAt && shortLink.expiresAt < new Date()) {
        throw new AppError('لینک کوتاه منقضی شده است', HTTP_STATUS.NOT_FOUND);
      }

      // Update click statistics
      shortLink.clicks = (shortLink.clicks || 0) + 1;
      shortLink.lastClickedAt = new Date();
      await shortLink.save();

      logger.info(`Short link accessed: ${shortCode} -> ${shortLink.originalUrl} (${shortLink.clicks} clicks)`);
      return shortLink;
    } catch (error) {
      logger.error('Error getting short link by code:', error);
      throw error;
    }
  }

  /**
   * Get short link by resource
   */
  static async getShortLinkByResource(resourceType, resourceId) {
    try {
      const shortLink = await ShortLink.findOne({
        resourceType,
        resourceId,
        isActive: true,
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      });

      return shortLink;
    } catch (error) {
      logger.error('Error getting short link by resource:', error);
      throw error;
    }
  }

  /**
   * Get all short links with pagination
   */
  static async getShortLinks(query = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        resourceType = null,
        isActive = true
      } = query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const parsedLimit = parseInt(limit);

      // Build query
      const mongoQuery = {};

      if (isActive !== 'all') {
        mongoQuery.isActive = isActive === 'true' || isActive === true;
      }

      if (resourceType) {
        mongoQuery.resourceType = resourceType;
      }

      if (search) {
        mongoQuery.$or = [
          { shortCode: { $regex: search, $options: 'i' } },
          { originalUrl: { $regex: search, $options: 'i' } }
        ];
      }

      const [shortLinks, total] = await Promise.all([
        ShortLink.find(mongoQuery)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parsedLimit)
          .lean(),
        ShortLink.countDocuments(mongoQuery)
      ]);

      return {
        data: shortLinks,
        pagination: {
          page: parseInt(page),
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit)
        }
      };
    } catch (error) {
      logger.error('Error getting short links:', error);
      throw error;
    }
  }

  /**
   * Update short link
   */
  static async updateShortLink(id, updateData, userId) {
    try {
      const shortLink = await ShortLink.findById(id);

      if (!shortLink) {
        throw new AppError('لینک کوتاه یافت نشد', HTTP_STATUS.NOT_FOUND);
      }

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          shortLink.set(key, updateData[key]);
        }
      });

      shortLink.updatedBy = userId;
      await shortLink.save();

      logger.info(`Short link updated: ${id}`);
      return shortLink;
    } catch (error) {
      logger.error('Error updating short link:', error);
      throw error;
    }
  }

  /**
   * Delete short link
   */
  static async deleteShortLink(id, userId) {
    try {
      const shortLink = await ShortLink.findById(id);

      if (!shortLink) {
        throw new AppError('لینک کوتاه یافت نشد', HTTP_STATUS.NOT_FOUND);
      }

      shortLink.deletedAt = new Date();
      shortLink.deletedBy = userId;
      shortLink.isActive = false;
      await shortLink.save();

      logger.info(`Short link deleted: ${id}`);
      return shortLink;
    } catch (error) {
      logger.error('Error deleting short link:', error);
      throw error;
    }
  }
}

