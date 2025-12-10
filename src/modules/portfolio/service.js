import { Portfolio } from './model.js';
import { Service } from '../services/model.js';
import { Category } from '../categories/model.js';
import { Media } from '../media/model.js';
import { logger } from '../../utils/logger.js';

export class PortfolioService {
  static async createPortfolio(portfolioData, userId) {
    try {
      // Check for duplicate slugs
      const existingSlugs = await Portfolio.find({
        $or: [{ 'slug.fa': portfolioData.slug.fa }, { 'slug.en': portfolioData.slug.en }],
        deletedAt: null
      });

      if (existingSlugs.length > 0) {
        throw new Error('این آدرس یکتا قبلاً استفاده شده است');
      }

      // Validate services exist
      if (portfolioData.services && portfolioData.services.length > 0) {
        const servicesCount = await Service.countDocuments({
          _id: { $in: portfolioData.services },
          deletedAt: null
        });

        if (servicesCount !== portfolioData.services.length) {
          throw new Error('برخی از خدمات انتخابی نامعتبر هستند');
        }
      }

      // Validate categories if provided
      if (portfolioData.categories && portfolioData.categories.length > 0) {
        const categoriesCount = await Category.countDocuments({
          _id: { $in: portfolioData.categories },
          type: 'portfolio',
          deletedAt: null
        });

        if (categoriesCount !== portfolioData.categories.length) {
          throw new Error('برخی از دسته‌بندی‌های انتخابی نامعتبر هستند');
        }
      }

      const portfolio = new Portfolio({
        ...portfolioData,
        createdBy: userId
      });

      await portfolio.save();
      await portfolio.populate(['services', 'categories']);

      // Track featured image usage
      if (portfolio.featuredImage) {
        await this.trackImageUsage(portfolio.featuredImage, portfolio._id, 'featuredImage');
      }

      // Track gallery images
      if (portfolio.gallery && portfolio.gallery.length > 0) {
        for (let i = 0; i < portfolio.gallery.length; i++) {
          await this.trackImageUsage(portfolio.gallery[i].url, portfolio._id, `gallery.${i}`);
        }
      }

      logger.info(`Portfolio created: ${portfolio.title.fa} by user ${userId}`);
      return portfolio;
    } catch (error) {
      logger.error('Portfolio creation error:', error);
      throw error;
    }
  }

  static async updatePortfolio(portfolioId, updateData, userId) {
    try {
      const portfolio = await Portfolio.findById(portfolioId);

      if (!portfolio) {
        throw new Error('نمونه کار یافت نشد');
      }

      // Check slug uniqueness if changed
      if (updateData.slug) {
        const existingSlugs = await Portfolio.find({
          _id: { $ne: portfolioId },
          $or: [{ 'slug.fa': updateData.slug.fa }, { 'slug.en': updateData.slug.en }],
          deletedAt: null
        });

        if (existingSlugs.length > 0) {
          throw new Error('این آدرس یکتا قبلاً استفاده شده است');
        }
      }

      // Validate services if provided
      if (updateData.services) {
        const servicesCount = await Service.countDocuments({
          _id: { $in: updateData.services },
          deletedAt: null
        });

        if (servicesCount !== updateData.services.length) {
          throw new Error('برخی از خدمات انتخابی نامعتبر هستند');
        }
      }

      // Track image usage changes
      if (updateData.featuredImage !== portfolio.featuredImage) {
        if (portfolio.featuredImage) {
          await this.removeImageUsage(portfolio.featuredImage, portfolio._id, 'featuredImage');
        }
        if (updateData.featuredImage) {
          await this.trackImageUsage(updateData.featuredImage, portfolio._id, 'featuredImage');
        }
      }

      Object.assign(portfolio, updateData);
      portfolio.updatedBy = userId;

      await portfolio.save();
      await portfolio.populate(['services', 'categories']);

      logger.info(`Portfolio updated: ${portfolio.title.fa} by user ${userId}`);
      return portfolio;
    } catch (error) {
      logger.error('Portfolio update error:', error);
      throw error;
    }
  }

  static async deletePortfolio(portfolioId, userId) {
    try {
      const portfolio = await Portfolio.findById(portfolioId);

      if (!portfolio) {
        throw new Error('نمونه کار یافت نشد');
      }

      await portfolio.softDelete();
      portfolio.updatedBy = userId;
      await portfolio.save();

      // Remove image usage tracking
      if (portfolio.featuredImage) {
        await this.removeImageUsage(portfolio.featuredImage, portfolio._id, 'featuredImage');
      }

      if (portfolio.gallery && portfolio.gallery.length > 0) {
        for (let i = 0; i < portfolio.gallery.length; i++) {
          await this.removeImageUsage(portfolio.gallery[i].url, portfolio._id, `gallery.${i}`);
        }
      }

      logger.info(`Portfolio deleted: ${portfolio.title.fa} by user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Portfolio deletion error:', error);
      throw error;
    }
  }

  static async getPortfolios(filters = {}) {
    try {
      const {
        page = 1,
        limit = 25,
        search = '',
        category = '',
        service = '',
        isFeatured,
        language = 'fa',
        sortBy = 'orderIndex',
        sortOrder = 'asc'
      } = filters;

      const parsedPage = parseInt(page) || 1;
      const parsedLimit = parseInt(limit) || 25;

      let query = { deletedAt: null };

      // Filter by status if provided
      if (filters.status) {
        query.status = filters.status;
      } else {
        // Default to active if not specified
        query.status = 'active';
      }

      if (search) {
        query.$or = [
          { [`title.${language}`]: new RegExp(search, 'i') },
          { [`description.${language}`]: new RegExp(search, 'i') },
          { 'client.name': new RegExp(search, 'i') }
        ];
      }

      if (category) query.categories = category;
      if (service) query.services = service;
      if (typeof isFeatured === 'boolean') query.isFeatured = isFeatured;

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (parsedPage - 1) * parsedLimit;

      const [portfolios, total] = await Promise.all([
        Portfolio.find(query)
          .populate('services', 'name')
          .populate('categories', 'name slug')
          .sort(sortOptions)
          .skip(skip)
          .limit(parsedLimit),
        Portfolio.countDocuments(query)
      ]);

      return {
        data: portfolios,
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
      logger.error('Get portfolios error:', error);
      throw error;
    }
  }

  static async getPortfolioBySlug(slug, language = 'fa') {
    try {
      const portfolio = await Portfolio.findOne({
        [`slug.${language}`]: slug,
        deletedAt: null,
        status: 'active'
      })
        .populate('services', 'name slug')
        .populate('categories', 'name slug');

      if (!portfolio) {
        throw new Error('نمونه کار یافت نشد');
      }

      // Increment view count
      portfolio.views += 1;
      await portfolio.save();

      return portfolio;
    } catch (error) {
      logger.error('Get portfolio by slug error:', error);
      throw error;
    }
  }

  static async getFeaturedPortfolios(limit = 6) {
    try {
      const portfolios = await Portfolio.find({
        isFeatured: true,
        deletedAt: null,
        status: 'active'
      })
        .populate('services', 'name')
        .populate('categories', 'name')
        .sort({ orderIndex: 1 })
        .limit(limit);

      return portfolios;
    } catch (error) {
      logger.error('Get featured portfolios error:', error);
      return [];
    }
  }

  static async getRelatedPortfolios(portfolioId, limit = 4) {
    try {
      const portfolio = await Portfolio.findById(portfolioId);

      if (!portfolio) {
        return [];
      }

      const relatedPortfolios = await Portfolio.find({
        _id: { $ne: portfolioId },
        $or: [
          { services: { $in: portfolio.services } },
          { categories: { $in: portfolio.categories } }
        ],
        deletedAt: null,
        status: 'active'
      })
        .populate('services', 'name')
        .sort({ views: -1, 'project.completedAt': -1 })
        .limit(limit);

      return relatedPortfolios;
    } catch (error) {
      logger.error('Get related portfolios error:', error);
      return [];
    }
  }

  static async trackImageUsage(imageUrl, portfolioId, field) {
    try {
      const media = await Media.findOne({ url: imageUrl });
      if (media) {
        await media.trackUsage('Portfolio', portfolioId, field);
      }
    } catch (error) {
      logger.error('Track image usage error:', error);
    }
  }

  static async removeImageUsage(imageUrl, portfolioId, field) {
    try {
      const media = await Media.findOne({ url: imageUrl });
      if (media) {
        await media.removeUsage('Portfolio', portfolioId, field);
      }
    } catch (error) {
      logger.error('Remove image usage error:', error);
    }
  }
}
