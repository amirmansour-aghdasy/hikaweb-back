import { Service } from './model.js';
import { logger } from '../../utils/logger.js';
import { BaseService } from '../../shared/services/baseService.js';

export class ServiceService extends BaseService {
  constructor() {
    super(Service, {
      cachePrefix: 'services',
      slugField: 'name',
      categoryType: 'service',
      populateFields: ['categories'],
      imageFields: {
        featuredImage: 'featuredImage'
      }
    });
  }
  static async createService(serviceData, userId) {
    try {
      const service = new ServiceService();
      
      // Generate and validate slug using BaseService
      await service.generateAndValidateSlug(serviceData);
      
      // Validate categories using BaseService
      await service.validateCategories(serviceData.categories);

      const serviceDoc = new Service({
        ...serviceData,
        createdBy: userId
      });

      await serviceDoc.save();
      await service.populateDocument(serviceDoc);

      // Track images using BaseService
      await service.trackAllImages(serviceDoc, serviceDoc._id);

      // Invalidate cache using BaseService
      await service.invalidateCache(serviceDoc);

      logger.info(`Service created: ${serviceDoc.name.fa} by user ${userId}`);
      return serviceDoc;
    } catch (error) {
      logger.error('Service creation error:', error);
      throw error;
    }
  }

  static async updateService(serviceId, updateData, userId) {
    try {
      const service = await Service.findById(serviceId);

      if (!service) {
        throw new Error('خدمت یافت نشد');
      }

      // Auto-generate slugs if name changed and slug not provided
      if (updateData.name && (!updateData.slug || !updateData.slug.fa || !updateData.slug.en)) {
        const generatedSlugs = generateSlugs(updateData.name);
        if (!updateData.slug) {
          updateData.slug = {};
        }
        updateData.slug.fa = updateData.slug.fa || generatedSlugs.fa;
        updateData.slug.en = updateData.slug.en || generatedSlugs.en;
      }

      // Ensure slugs are unique if changed
      if (updateData.slug) {
        const checkDuplicateFa = async (slug) => {
          const exists = await Service.findOne({ 
            _id: { $ne: serviceId },
            'slug.fa': slug, 
            deletedAt: null 
          });
          return !!exists;
        };
        
        const checkDuplicateEn = async (slug) => {
          const exists = await Service.findOne({ 
            _id: { $ne: serviceId },
            'slug.en': slug, 
            deletedAt: null 
          });
          return !!exists;
        };

        updateData.slug.fa = await ensureUniqueSlug(checkDuplicateFa, updateData.slug.fa);
        updateData.slug.en = await ensureUniqueSlug(checkDuplicateEn, updateData.slug.en);
      }

      // Track image usage changes
      if (updateData.featuredImage !== service.featuredImage) {
        if (service.featuredImage) {
          await this.removeImageUsage(service.featuredImage, service._id, 'featuredImage');
        }
        if (updateData.featuredImage) {
          await this.trackImageUsage(updateData.featuredImage, service._id, 'featuredImage');
        }
      }

      const oldSlug = {
        fa: service.slug?.fa,
        en: service.slug?.en
      };

      Object.assign(service, updateData);
      service.updatedBy = userId;

      await service.save();
      await service.populate('categories');

      // Invalidate cache if slug changed
      const slugChanged = updateData.slug && (
        updateData.slug.fa !== oldSlug.fa || 
        updateData.slug.en !== oldSlug.en
      );
      
      if (slugChanged) {
        await cacheService.deletePattern('services:*');
        await cacheService.delete(`service:${service._id}`);
        if (oldSlug.fa) await cacheService.delete(`services:slug:${oldSlug.fa}`);
        if (oldSlug.en) await cacheService.delete(`services:slug:${oldSlug.en}`);
        if (service.slug?.fa) await cacheService.delete(`services:slug:${service.slug.fa}`);
        if (service.slug?.en) await cacheService.delete(`services:slug:${service.slug.en}`);
      }

      logger.info(`Service updated: ${service.name.fa} by user ${userId}`);
      return service;
    } catch (error) {
      logger.error('Service update error:', error);
      throw error;
    }
  }

  static async deleteService(serviceId, userId) {
    try {
      const service = new ServiceService();
      const serviceDoc = await Service.findById(serviceId);

      if (!serviceDoc) {
        throw new Error('خدمت یافت نشد');
      }

      await serviceDoc.softDelete();
      serviceDoc.updatedBy = userId;
      await serviceDoc.save();

      // Remove image usage tracking using BaseService
      await service.removeAllImages(serviceDoc, serviceDoc._id);

      // Invalidate cache using BaseService - slug is now free for reuse
      await service.invalidateCache(serviceDoc);

      logger.info(`Service deleted: ${serviceDoc.name.fa} by user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Service deletion error:', error);
      throw error;
    }
  }

  static async getServices(filters = {}) {
    try {
      const {
        page = 1,
        limit = 25,
        search = '',
        category = '',
        status = '',
        isPopular,
        language = 'fa',
        sortBy = 'orderIndex',
        sortOrder = 'asc'
      } = filters;

      const parsedPage = parseInt(page) || 1;
      const parsedLimit = parseInt(limit) || 25;

      let query = { deletedAt: null };

      if (search) {
        query.$or = [
          { [`name.${language}`]: new RegExp(search, 'i') },
          { [`description.${language}`]: new RegExp(search, 'i') }
        ];
      }

      if (category) {
        query.categories = category;
      }

      if (status && ['active', 'inactive', 'archived'].includes(status)) {
        query.status = status;
      }

      if (typeof isPopular === 'boolean') {
        query.isPopular = isPopular;
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (parsedPage - 1) * parsedLimit;

      const [services, total] = await Promise.all([
        Service.find(query)
          .populate('categories', 'name slug')
          .sort(sortOptions)
          .skip(skip)
          .limit(parsedLimit),
        Service.countDocuments(query)
      ]);

      return {
        data: services,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit),
          hasNext: parsedPage < Math.ceil(total / parsedLimit),
          hasPrev: parsedPage > 1
        }
      };
    } catch (error) {
      logger.error('Get services error:', error);
      throw error;
    }
  }

  static async getServiceBySlug(slug, language = 'fa') {
    try {
      const service = await Service.findOne({
        [`slug.${language}`]: slug,
        deletedAt: null
      })
        .populate('categories', 'name slug')
        .populate('relatedCaseStudies')
        .populate('relatedArticles')
        .populate('mainContent.firstSection.slides', 'title featuredImage slug')
        .populate('mainContent.secondSection.slides', 'title featuredImage slug');

      if (!service) {
        throw new Error('خدمت یافت نشد');
      }

      return service;
    } catch (error) {
      logger.error('Get service by slug error:', error);
      throw error;
    }
  }

  static async getPopularServices(limit = 6) {
    try {
      const services = await Service.find({
        isPopular: true,
        deletedAt: null
      })
        .populate('categories', 'name')
        .sort({ orderIndex: 1 })
        .limit(limit);

      return services;
    } catch (error) {
      logger.error('Get popular services error:', error);
      return [];
    }
  }

  static async trackImageUsage(imageUrl, serviceId, field) {
    try {
      const media = await Media.findOne({ url: imageUrl });
      if (media) {
        await media.trackUsage('Service', serviceId, field);
      }
    } catch (error) {
      logger.error('Track image usage error:', error);
    }
  }

  static async removeImageUsage(imageUrl, serviceId, field) {
    try {
      const media = await Media.findOne({ url: imageUrl });
      if (media) {
        await media.removeUsage('Service', serviceId, field);
      }
    } catch (error) {
      logger.error('Remove image usage error:', error);
    }
  }
}
