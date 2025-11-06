import { Brand } from './model.js';
import { AppError } from '../../utils/appError.js';
import { logger } from '../../utils/logger.js';
import { cacheService } from '../../services/cache.js';

export class BrandService {
  static async createBrand(data, userId) {
    try {
      // Check if slug exists
      const existingBrand = await Brand.findOne({ slug: data.slug });
      if (existingBrand) {
        throw new AppError('اسلاگ برند تکراری است', 400);
      }

      const brand = new Brand({
        ...data,
        createdBy: userId,
        updatedBy: userId
      });

      await brand.save();

      // Clear cache
      await cacheService.deletePattern('brands:*');

      logger.info('Brand created:', { id: brand._id, name: brand.name });

      return brand;
    } catch (error) {
      logger.error('Error creating brand:', error);
      throw error;
    }
  }

  static async getBrands(query = {}) {
    try {
      const {
        page = 1,
        limit = 25,
        status = 'active',
        industry,
        serviceField,
        search,
        tags,
        isFeatured,
        isPublic,
        sortBy = 'orderIndex',
        sortOrder = 'asc'
      } = query;

      const cacheKey = `brands:list:${JSON.stringify(query)}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const filter = { deletedAt: null };

      if (status && status !== 'all') {
        filter.status = status;
      }

      if (industry) {
        filter.industry = { $regex: industry, $options: 'i' };
      }

      if (serviceField) {
        filter.serviceField = { $regex: serviceField, $options: 'i' };
      }

      if (isFeatured !== undefined) {
        filter.isFeatured = isFeatured === 'true';
      }

      if (isPublic !== undefined) {
        filter.isPublic = isPublic === 'true';
      }

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { 'description.fa': { $regex: search, $options: 'i' } },
          { 'description.en': { $regex: search, $options: 'i' } },
          { industry: { $regex: search, $options: 'i' } },
          { serviceField: { $regex: search, $options: 'i' } }
        ];
      }

      if (tags && tags.length > 0) {
        filter.tags = { $in: Array.isArray(tags) ? tags : [tags] };
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (page - 1) * limit;

      const [brands, total] = await Promise.all([
        Brand.find(filter).sort(sortOptions).skip(skip).limit(parseInt(limit)).select('-__v'),
        Brand.countDocuments(filter)
      ]);

      const result = {
        brands,
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
      logger.error('Error getting brands:', error);
      throw error;
    }
  }

  static async getBrandBySlug(slug) {
    try {
      const cacheKey = `brands:slug:${slug}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const brand = await Brand.findOne({
        slug,
        deletedAt: null,
        status: 'active',
        isPublic: true
      });

      if (!brand) {
        throw new AppError('برند یافت نشد', 404);
      }

      await cacheService.set(cacheKey, brand, 600); // 10 minutes
      return brand;
    } catch (error) {
      logger.error('Error getting brand by slug:', error);
      throw error;
    }
  }

  static async updateBrand(id, data, userId) {
    try {
      const brand = await Brand.findById(id);
      if (!brand || brand.deletedAt) {
        throw new AppError('برند یافت نشد', 404);
      }

      // Check slug uniqueness if changed
      if (data.slug && data.slug !== brand.slug) {
        const existingBrand = await Brand.findOne({
          slug: data.slug,
          _id: { $ne: id }
        });
        if (existingBrand) {
          throw new AppError('اسلاگ برند تکراری است', 400);
        }
      }

      Object.assign(brand, data, { updatedBy: userId });
      await brand.save();

      // Clear cache
      await cacheService.deletePattern('brands:*');

      logger.info('Brand updated:', { id: brand._id });

      return brand;
    } catch (error) {
      logger.error('Error updating brand:', error);
      throw error;
    }
  }

  static async deleteBrand(id, userId) {
    try {
      const brand = await Brand.findById(id);
      if (!brand || brand.deletedAt) {
        throw new AppError('برند یافت نشد', 404);
      }

      brand.deletedAt = new Date();
      brand.updatedBy = userId;
      await brand.save();

      // Clear cache
      await cacheService.deletePattern('brands:*');

      logger.info('Brand deleted:', { id });

      return true;
    } catch (error) {
      logger.error('Error deleting brand:', error);
      throw error;
    }
  }

  static async getFeaturedBrands(limit = 12) {
    try {
      const cacheKey = `brands:featured:${limit}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const brands = await Brand.find({
        status: 'active',
        isPublic: true,
        isFeatured: true,
        deletedAt: null
      })
        .sort({ orderIndex: 1, createdAt: 1 })
        .limit(limit)
        .select('name slug logo description industry serviceField projectsCount');

      await cacheService.set(cacheKey, brands, 600); // 10 minutes
      return brands;
    } catch (error) {
      logger.error('Error getting featured brands:', error);
      throw error;
    }
  }

  static async getBrandsByIndustry(industry, limit = 20) {
    try {
      const cacheKey = `brands:industry:${industry}:${limit}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const brands = await Brand.find({
        industry: { $regex: industry, $options: 'i' },
        status: 'active',
        isPublic: true,
        deletedAt: null
      })
        .sort({ orderIndex: 1, name: 1 })
        .limit(limit)
        .select('name slug logo description serviceField projectsCount');

      await cacheService.set(cacheKey, brands, 600); // 10 minutes
      return brands;
    } catch (error) {
      logger.error('Error getting brands by industry:', error);
      throw error;
    }
  }

  static async getBrandStats() {
    try {
      const cacheKey = 'brands:stats';
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const stats = await Brand.aggregate([
        {
          $match: {
            status: 'active',
            isPublic: true,
            deletedAt: null
          }
        },
        {
          $group: {
            _id: null,
            totalBrands: { $sum: 1 },
            totalProjects: { $sum: '$projectsCount' },
            industries: { $addToSet: '$industry' },
            serviceFields: { $addToSet: '$serviceField' }
          }
        },
        {
          $project: {
            _id: 0,
            totalBrands: 1,
            totalProjects: 1,
            industriesCount: {
              $size: { $filter: { input: '$industries', cond: { $ne: ['$this', null] } } }
            },
            serviceFieldsCount: {
              $size: { $filter: { input: '$serviceFields', cond: { $ne: ['$this', null] } } }
            }
          }
        }
      ]);

      const result = stats[0] || {
        totalBrands: 0,
        totalProjects: 0,
        industriesCount: 0,
        serviceFieldsCount: 0
      };

      await cacheService.set(cacheKey, result, 1800); // 30 minutes
      return result;
    } catch (error) {
      logger.error('Error getting brand stats:', error);
      throw error;
    }
  }
}
