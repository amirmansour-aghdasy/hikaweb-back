import { Service } from './model.js';
import { Category } from '../categories/model.js';
import { Media } from '../media/model.js';
import { logger } from '../../utils/logger.js';

export class ServiceService {
  static async createService(serviceData, userId) {
    try {
      // Check for duplicate slugs
      const existingSlugs = await Service.find({
        $or: [{ 'slug.fa': serviceData.slug.fa }, { 'slug.en': serviceData.slug.en }],
        deletedAt: null
      });

      if (existingSlugs.length > 0) {
        throw new Error('این آدرس یکتا قبلاً استفاده شده است');
      }

      // Validate categories
      if (serviceData.categories && serviceData.categories.length > 0) {
        const categoriesCount = await Category.countDocuments({
          _id: { $in: serviceData.categories },
          type: 'service',
          deletedAt: null
        });

        if (categoriesCount !== serviceData.categories.length) {
          throw new Error('برخی از دسته‌بندی‌های انتخابی نامعتبر هستند');
        }
      }

      const service = new Service({
        ...serviceData,
        createdBy: userId
      });

      await service.save();
      await service.populate('categories');

      // Track featured image usage
      if (service.featuredImage) {
        await this.trackImageUsage(service.featuredImage, service._id, 'featuredImage');
      }

      logger.info(`Service created: ${service.name.fa} by user ${userId}`);
      return service;
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

      // Check slug uniqueness if changed
      if (updateData.slug) {
        const existingSlugs = await Service.find({
          _id: { $ne: serviceId },
          $or: [{ 'slug.fa': updateData.slug.fa }, { 'slug.en': updateData.slug.en }],
          deletedAt: null
        });

        if (existingSlugs.length > 0) {
          throw new Error('این آدرس یکتا قبلاً استفاده شده است');
        }
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

      Object.assign(service, updateData);
      service.updatedBy = userId;

      await service.save();
      await service.populate('categories');

      logger.info(`Service updated: ${service.name.fa} by user ${userId}`);
      return service;
    } catch (error) {
      logger.error('Service update error:', error);
      throw error;
    }
  }

  static async deleteService(serviceId, userId) {
    try {
      const service = await Service.findById(serviceId);

      if (!service) {
        throw new Error('خدمت یافت نشد');
      }

      await service.softDelete();
      service.updatedBy = userId;
      await service.save();

      // Remove image usage tracking
      if (service.featuredImage) {
        await this.removeImageUsage(service.featuredImage, service._id, 'featuredImage');
      }

      logger.info(`Service deleted: ${service.name.fa} by user ${userId}`);
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
        limit = 10,
        search = '',
        category = '',
        isPopular,
        language = 'fa',
        sortBy = 'orderIndex',
        sortOrder = 'asc'
      } = filters;

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

      if (typeof isPopular === 'boolean') {
        query.isPopular = isPopular;
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (page - 1) * limit;

      const [services, total] = await Promise.all([
        Service.find(query)
          .populate('categories', 'name slug')
          .sort(sortOptions)
          .skip(skip)
          .limit(limit),
        Service.countDocuments(query)
      ]);

      return {
        data: services,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
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
        .populate('relatedArticles');

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
