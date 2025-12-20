/**
 * BaseService - Utility functions for common service operations
 * 
 * این ماژول شامل توابع کمکی برای عملیات مشترک در services است:
 * - Slug generation and validation
 * - Category validation
 * - Cache invalidation
 * - Image tracking
 * 
 * این توابع به صورت static طراحی شده‌اند تا بتوانند در static methods استفاده شوند.
 * 
 * @example
 * import { BaseService } from '../../shared/services/baseService.js';
 * 
 * export class ArticleService {
 *   static async createArticle(articleData, userId) {
 *     const service = new BaseService(Article, {
 *       cachePrefix: 'articles',
 *       slugField: 'title',
 *       categoryType: 'article'
 *     });
 *     
 *     await service.generateAndValidateSlug(articleData);
 *     await service.validateCategories(articleData.categories);
 *     // ...
 *   }
 * }
 */

import { generateSlugs, ensureUniqueSlug } from '../../utils/slugGenerator.js';
import { Category } from '../../modules/categories/model.js';
import { Media } from '../../modules/media/model.js';
import { cacheService } from '../../services/cache.js';
import { logger } from '../../utils/logger.js';

export class BaseService {
  /**
   * @param {mongoose.Model} Model - Mongoose model for this service
   * @param {Object} options - Configuration options
   * @param {string} options.cachePrefix - Cache key prefix (e.g., 'articles', 'services')
   * @param {string} options.slugField - Field name for slug generation ('title' or 'name')
   * @param {string} options.categoryType - Category type for validation ('article', 'service', etc.)
   * @param {Array<string>} options.populateFields - Fields to populate after save
   * @param {Object} options.imageFields - Image fields to track (e.g., { featuredImage: 'featuredImage', gallery: 'gallery' })
   */
  constructor(Model, options = {}) {
    if (!Model) {
      throw new Error('Model is required for BaseService');
    }
    
    this.Model = Model;
    this.cachePrefix = options.cachePrefix || Model.modelName.toLowerCase() + 's';
    this.slugField = options.slugField || 'title';
    this.categoryType = options.categoryType || null;
    this.populateFields = options.populateFields || [];
    this.imageFields = options.imageFields || {};
  }

  /**
   * Generate and validate slug from title/name field
   * @param {Object} data - Data object containing title/name and optional slug
   * @param {string|null} excludeId - Document ID to exclude from uniqueness check (for updates)
   * @returns {Promise<Object>} Updated data object with validated slug
   */
  async generateAndValidateSlug(data, excludeId = null) {
    try {
      const titleField = this.slugField; // 'title' or 'name'
      const titleData = data[titleField];
      
      if (!titleData) {
        return data; // No title/name, skip slug generation
      }

      // Auto-generate slugs if not provided
      if (!data.slug || !data.slug.fa || !data.slug.en) {
        const generatedSlugs = generateSlugs(titleData);
        data.slug = {
          fa: data.slug?.fa || generatedSlugs.fa,
          en: data.slug?.en || generatedSlugs.en
        };
      }

      // Ensure slugs are unique
      const checkDuplicateFa = async (slug) => {
        const query = { 'slug.fa': slug, deletedAt: null };
        if (excludeId) {
          query._id = { $ne: excludeId };
        }
        const exists = await this.Model.findOne(query);
        return !!exists;
      };
      
      const checkDuplicateEn = async (slug) => {
        const query = { 'slug.en': slug, deletedAt: null };
        if (excludeId) {
          query._id = { $ne: excludeId };
        }
        const exists = await this.Model.findOne(query);
        return !!exists;
      };

      data.slug.fa = await ensureUniqueSlug(checkDuplicateFa, data.slug.fa);
      data.slug.en = await ensureUniqueSlug(checkDuplicateEn, data.slug.en);

      return data;
    } catch (error) {
      logger.error(`Error generating/validating slug for ${this.Model.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Validate categories exist and match the required type
   * @param {Array<string>} categoryIds - Array of category IDs to validate
   * @param {string|null} categoryType - Category type to validate against (overrides this.categoryType)
   * @throws {Error} If any category is invalid
   */
  async validateCategories(categoryIds, categoryType = null) {
    if (!categoryIds || categoryIds.length === 0) {
      return; // No categories to validate
    }

    const type = categoryType || this.categoryType;
    if (!type) {
      return; // No category type specified, skip validation
    }

    try {
      const categoriesCount = await Category.countDocuments({
        _id: { $in: categoryIds },
        type: type,
        deletedAt: null
      });

      if (categoriesCount !== categoryIds.length) {
        throw new Error('برخی از دسته‌بندی‌های انتخابی نامعتبر هستند');
      }
    } catch (error) {
      logger.error(`Error validating categories for ${this.Model.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache for this resource
   * @param {Object} resource - Resource document
   * @param {Object} oldSlug - Old slug object (for updates)
   * @param {boolean} slugChanged - Whether slug changed (for updates)
   */
  async invalidateCache(resource, oldSlug = null, slugChanged = false) {
    try {
      const prefix = this.cachePrefix;
      const resourceId = resource._id;

      // Always invalidate pattern and specific resource
      await cacheService.deletePattern(`${prefix}:*`);
      await cacheService.delete(`${prefix.slice(0, -1)}:${resourceId}`); // Remove 's' from plural

      // Invalidate slug-based cache if slug exists
      if (resource.slug) {
        if (resource.slug.fa) {
          await cacheService.delete(`${prefix}:slug:${resource.slug.fa}`);
        }
        if (resource.slug.en) {
          await cacheService.delete(`${prefix}:slug:${resource.slug.en}`);
        }
      }

      // Invalidate old slug cache if slug changed
      if (slugChanged && oldSlug) {
        if (oldSlug.fa) {
          await cacheService.delete(`${prefix}:slug:${oldSlug.fa}`);
        }
        if (oldSlug.en) {
          await cacheService.delete(`${prefix}:slug:${oldSlug.en}`);
        }
      }
    } catch (error) {
      logger.error(`Error invalidating cache for ${this.Model.modelName}:`, error);
      // Don't throw - cache invalidation failure shouldn't break the operation
    }
  }

  /**
   * Track image usage in Media model
   * @param {string} imageUrl - Image URL to track
   * @param {string|ObjectId} resourceId - Resource ID using the image
   * @param {string} field - Field name where image is used (e.g., 'featuredImage', 'gallery.0')
   */
  async trackImageUsage(imageUrl, resourceId, field) {
    if (!imageUrl) return;

    try {
      const media = await Media.findOne({ url: imageUrl });
      if (media) {
        await media.trackUsage(this.Model.modelName, resourceId, field);
      }
    } catch (error) {
      logger.error(`Error tracking image usage for ${this.Model.modelName}:`, error);
      // Don't throw - image tracking failure shouldn't break the operation
    }
  }

  /**
   * Remove image usage tracking from Media model
   * @param {string} imageUrl - Image URL to untrack
   * @param {string|ObjectId} resourceId - Resource ID that was using the image
   * @param {string} field - Field name where image was used
   */
  async removeImageUsage(imageUrl, resourceId, field) {
    if (!imageUrl) return;

    try {
      const media = await Media.findOne({ url: imageUrl });
      if (media) {
        await media.removeUsage(this.Model.modelName, resourceId, field);
      }
    } catch (error) {
      logger.error(`Error removing image usage for ${this.Model.modelName}:`, error);
      // Don't throw - image tracking failure shouldn't break the operation
    }
  }

  /**
   * Track all image fields defined in imageFields option
   * @param {Object} resource - Resource document
   * @param {string|ObjectId} resourceId - Resource ID
   */
  async trackAllImages(resource, resourceId) {
    for (const [fieldName, fieldPath] of Object.entries(this.imageFields)) {
      const imageValue = this._getNestedValue(resource, fieldPath);
      
      if (Array.isArray(imageValue)) {
        // Handle array fields (e.g., gallery)
        imageValue.forEach((item, index) => {
          const imageUrl = typeof item === 'string' ? item : item.url;
          if (imageUrl) {
            this.trackImageUsage(imageUrl, resourceId, `${fieldPath}.${index}`);
          }
        });
      } else if (imageValue) {
        // Handle single image fields
        this.trackImageUsage(imageValue, resourceId, fieldPath);
      }
    }
  }

  /**
   * Remove tracking for all image fields
   * @param {Object} resource - Resource document
   * @param {string|ObjectId} resourceId - Resource ID
   */
  async removeAllImages(resource, resourceId) {
    for (const [fieldName, fieldPath] of Object.entries(this.imageFields)) {
      const imageValue = this._getNestedValue(resource, fieldPath);
      
      if (Array.isArray(imageValue)) {
        imageValue.forEach((item, index) => {
          const imageUrl = typeof item === 'string' ? item : item.url;
          if (imageUrl) {
            this.removeImageUsage(imageUrl, resourceId, `${fieldPath}.${index}`);
          }
        });
      } else if (imageValue) {
        this.removeImageUsage(imageValue, resourceId, fieldPath);
      }
    }
  }

  /**
   * Helper method to get nested value from object
   * @private
   */
  _getNestedValue(obj, path) {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Populate fields after save
   * @param {Object} document - Mongoose document
   * @returns {Promise<Object>} Populated document
   */
  async populateDocument(document) {
    if (this.populateFields.length > 0) {
      await document.populate(this.populateFields);
    }
    return document;
  }
}

