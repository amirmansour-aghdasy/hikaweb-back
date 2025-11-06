import { FAQ } from './model.js';
import { Service } from '../services/model.js';
import { AppError } from '../../utils/appError.js';
import { logger } from '../../utils/logger.js';
import { cacheService } from '../../services/cache.js';

export class FAQService {
  static async createFAQ(data, userId) {
    try {
      // Verify service exists if provided
      if (data.serviceId) {
        const service = await Service.findById(data.serviceId);
        if (!service) {
          throw new AppError('سرویس مورد نظر یافت نشد', 404);
        }
      }

      const faq = new FAQ({
        ...data,
        createdBy: userId,
        updatedBy: userId
      });

      await faq.save();

      // Clear cache
      await cacheService.deletePattern('faq:*');

      logger.info('FAQ created:', { id: faq._id });

      return faq;
    } catch (error) {
      logger.error('Error creating FAQ:', error);
      throw error;
    }
  }

  static async getFAQs(query = {}) {
    try {
      const {
        page = 1,
        limit = 25,
        status = 'active',
        serviceId,
        search,
        tags,
        isPublic,
        sortBy = 'orderIndex',
        sortOrder = 'asc'
      } = query;

      const cacheKey = `faq:list:${JSON.stringify(query)}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const filter = { deletedAt: null };

      if (status && status !== 'all') {
        filter.status = status;
      }

      if (serviceId) {
        filter.serviceId = serviceId;
      }

      if (isPublic !== undefined) {
        filter.isPublic = isPublic === 'true';
      }

      if (search) {
        filter.$or = [
          { 'question.fa': { $regex: search, $options: 'i' } },
          { 'question.en': { $regex: search, $options: 'i' } },
          { 'answer.fa': { $regex: search, $options: 'i' } },
          { 'answer.en': { $regex: search, $options: 'i' } }
        ];
      }

      if (tags && tags.length > 0) {
        filter.tags = { $in: Array.isArray(tags) ? tags : [tags] };
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (page - 1) * limit;

      const [faqs, total] = await Promise.all([
        FAQ.find(filter)
          .populate('serviceId', 'name slug')
          .populate('categoryIds', 'name slug')
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .select('-__v'),
        FAQ.countDocuments(filter)
      ]);

      const result = {
        faqs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };

      await cacheService.set(cacheKey, result, 300); // 5 minutes
      return result;
    } catch (error) {
      logger.error('Error getting FAQs:', error);
      throw error;
    }
  }

  static async getFAQsByService(serviceId, limit = 20) {
    try {
      const cacheKey = `faq:service:${serviceId}:${limit}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const faqs = await FAQ.find({
        serviceId,
        status: 'active',
        isPublic: true,
        deletedAt: null
      })
        .sort({ orderIndex: 1, createdAt: 1 })
        .limit(limit)
        .select('question answer tags');

      await cacheService.set(cacheKey, faqs, 600); // 10 minutes
      return faqs;
    } catch (error) {
      logger.error('Error getting FAQs by service:', error);
      throw error;
    }
  }

  static async updateFAQ(id, data, userId) {
    try {
      const faq = await FAQ.findById(id);
      if (!faq || faq.deletedAt) {
        throw new AppError('سوال متداول یافت نشد', 404);
      }

      // Verify service exists if provided
      if (data.serviceId) {
        const service = await Service.findById(data.serviceId);
        if (!service) {
          throw new AppError('سرویس مورد نظر یافت نشد', 404);
        }
      }

      Object.assign(faq, data, { updatedBy: userId });
      await faq.save();

      // Clear cache
      await cacheService.deletePattern('faq:*');

      logger.info('FAQ updated:', { id: faq._id });

      return faq;
    } catch (error) {
      logger.error('Error updating FAQ:', error);
      throw error;
    }
  }

  static async deleteFAQ(id, userId) {
    try {
      const faq = await FAQ.findById(id);
      if (!faq || faq.deletedAt) {
        throw new AppError('سوال متداول یافت نشد', 404);
      }

      faq.deletedAt = new Date();
      faq.updatedBy = userId;
      await faq.save();

      // Clear cache
      await cacheService.deletePattern('faq:*');

      logger.info('FAQ deleted:', { id });

      return true;
    } catch (error) {
      logger.error('Error deleting FAQ:', error);
      throw error;
    }
  }

  static async getPublicFAQs(limit = 50) {
    try {
      const cacheKey = `faq:public:${limit}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const faqs = await FAQ.find({
        status: 'active',
        isPublic: true,
        deletedAt: null
      })
        .populate('serviceId', 'name slug')
        .sort({ orderIndex: 1, createdAt: 1 })
        .limit(limit)
        .select('question answer serviceId tags');

      await cacheService.set(cacheKey, faqs, 600); // 10 minutes
      return faqs;
    } catch (error) {
      logger.error('Error getting public FAQs:', error);
      throw error;
    }
  }
}
