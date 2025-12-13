import { Category } from './model.js';
import { logger } from '../../utils/logger.js';
import { Article } from '../articles/model.js';
import { Service } from '../services/model.js';
import { Portfolio } from '../portfolio/model.js';

export class CategoryService {
  static async createCategory(categoryData, userId) {
    try {
      // Check for duplicate slugs in same type
      const existingSlugs = await Category.find({
        type: categoryData.type,
        $or: [{ 'slug.fa': categoryData.slug.fa }, { 'slug.en': categoryData.slug.en }],
        deletedAt: null
      });

      if (existingSlugs.length > 0) {
        throw new Error('این آدرس یکتا قبلاً در این نوع دسته‌بندی استفاده شده است');
      }

      // Validate parent category if provided
      if (categoryData.parent) {
        const parentCategory = await Category.findById(categoryData.parent);
        if (!parentCategory || parentCategory.type !== categoryData.type) {
          throw new Error('دسته‌بندی والد نامعتبر است');
        }

        if (parentCategory.level >= 2) {
          throw new Error('بیش از ۳ سطح تودرتو مجاز نیست');
        }
      }

      const category = new Category({
        ...categoryData,
        createdBy: userId
      });

      await category.save();

      logger.info(`Category created: ${category.name.fa} by user ${userId}`);
      return category;
    } catch (error) {
      logger.error('Category creation error:', error);
      throw error;
    }
  }

  static async updateCategory(categoryId, updateData, userId) {
    try {
      const category = await Category.findById(categoryId);

      if (!category) {
        throw new Error('دسته‌بندی یافت نشد');
      }

      // Check slug uniqueness if changed
      if (updateData.slug) {
        const existingSlugs = await Category.find({
          _id: { $ne: categoryId },
          type: category.type,
          $or: [{ 'slug.fa': updateData.slug.fa }, { 'slug.en': updateData.slug.en }],
          deletedAt: null
        });

        if (existingSlugs.length > 0) {
          throw new Error('این آدرس یکتا قبلاً استفاده شده است');
        }
      }

      // Update fields explicitly to ensure Mongoose tracks changes
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          category.set(key, updateData[key]);
        }
      });
      
      category.updatedBy = userId;

      // Log before save for debugging
      logger.info(`Category before save - status: ${category.status}, updateData: ${JSON.stringify(updateData)}`);

      await category.save();

      // Log after save for debugging
      logger.info(`Category after save - status: ${category.status}`);

      // Populate related fields before returning
      await category.populate('parent', 'name');
      await category.populate('children', 'name');

      logger.info(`Category updated: ${category.name.fa} by user ${userId}`);
      return category;
    } catch (error) {
      logger.error('Category update error:', error);
      throw error;
    }
  }

  static async deleteCategory(categoryId, userId) {
    try {
      const category = await Category.findById(categoryId);

      if (!category) {
        throw new Error('دسته‌بندی یافت نشد');
      }

      // Check if category has children
      if (category.children && category.children.length > 0) {
        throw new Error('ابتدا زیردسته‌ها را حذف کنید');
      }

      // Check if category is in use
      const models = {
        article: () => import('../articles/model.js').then(m => m.Article),
        service: () => import('../services/model.js').then(m => m.Service),
        portfolio: () => import('../portfolio/model.js').then(m => m.Portfolio)
      };

      if (models[category.type]) {
        const Model = await models[category.type]();
        const usageCount = await Model.countDocuments({
          categories: categoryId,
          deletedAt: null
        });

        if (usageCount > 0) {
          throw new Error('این دسته‌بندی در حال استفاده است و قابل حذف نیست');
        }
      }

      await category.softDelete();
      category.updatedBy = userId;
      await category.save();

      // Remove from parent's children array
      if (category.parent) {
        await Category.findByIdAndUpdate(category.parent, {
          $pull: { children: categoryId }
        });
      }

      logger.info(`Category deleted: ${category.name.fa} by user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Category deletion error:', error);
      throw error;
    }
  }

  static async getCategories(filters = {}) {
    try {
      const { 
        type = '', 
        parent = '', 
        level = '', 
        search = '', 
        language = 'fa',
        page = 1,
        limit = 25
      } = filters;

      let query = { deletedAt: null };

      if (type) query.type = type;
      if (parent === 'null' || parent === null) {
        query.parent = null;
      } else if (parent) {
        query.parent = parent;
      }
      if (level !== '') query.level = parseInt(level);

      if (search) {
        query.$or = [
          { [`name.${language}`]: new RegExp(search, 'i') },
          { [`description.${language}`]: new RegExp(search, 'i') }
        ];
      }

      const parsedPage = parseInt(page) || 1;
      const parsedLimit = parseInt(limit) || 25;
      const skip = (parsedPage - 1) * parsedLimit;

      const [categories, total] = await Promise.all([
        Category.find(query)
          .populate('parent', 'name')
          .populate('children', 'name')
          .sort({ orderIndex: 1, 'name.fa': 1 })
          .skip(skip)
          .limit(parsedLimit)
          .lean(),
        Category.countDocuments(query)
      ]);

      // Calculate statistics for each category
      // Group categories by type for batch counting
      const categoriesByType = {
        article: [],
        service: [],
        portfolio: [],
        faq: []
      };

      categories.forEach(category => {
        const type = category.type || 'article';
        if (categoriesByType[type]) {
          categoriesByType[type].push(category._id);
        }
      });

      // Batch count items for each type
      const [articleCounts, serviceCounts, portfolioCounts] = await Promise.all([
        categoriesByType.article.length > 0
          ? Article.aggregate([
              { $match: { categories: { $in: categoriesByType.article }, deletedAt: null } },
              { $unwind: '$categories' },
              { $match: { categories: { $in: categoriesByType.article } } },
              { $group: { _id: '$categories', count: { $sum: 1 } } }
            ])
          : [],
        categoriesByType.service.length > 0
          ? Service.aggregate([
              { $match: { categories: { $in: categoriesByType.service }, deletedAt: null } },
              { $unwind: '$categories' },
              { $match: { categories: { $in: categoriesByType.service } } },
              { $group: { _id: '$categories', count: { $sum: 1 } } }
            ])
          : [],
        categoriesByType.portfolio.length > 0
          ? Portfolio.aggregate([
              { $match: { categories: { $in: categoriesByType.portfolio }, deletedAt: null } },
              { $unwind: '$categories' },
              { $match: { categories: { $in: categoriesByType.portfolio } } },
              { $group: { _id: '$categories', count: { $sum: 1 } } }
            ])
          : []
      ]);

      // Create count maps for quick lookup
      const itemCountMap = new Map();
      [...articleCounts, ...serviceCounts, ...portfolioCounts].forEach(item => {
        const categoryId = item._id.toString();
        const currentCount = itemCountMap.get(categoryId) || 0;
        itemCountMap.set(categoryId, currentCount + item.count);
      });

      // Add statistics to each category
      const categoriesWithStats = categories.map(category => {
        // Calculate childrenCount from populated children array
        const childrenCount = category.children?.length || 0;

        // Get itemCount from map (default to 0)
        const categoryId = category._id.toString();
        const itemCount = itemCountMap.get(categoryId) || 0;

        return {
          ...category,
          itemCount,
          childrenCount
        };
      });

      return {
        data: categoriesWithStats,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit),
          hasNext: skip + parsedLimit < total,
          hasPrev: parsedPage > 1
        }
      };
    } catch (error) {
      logger.error('Get categories error:', error);
      throw error;
    }
  }

  static async getCategoryTree(type) {
    try {
      const categories = await Category.find({
        type,
        deletedAt: null
      }).sort({ orderIndex: 1 });

      // Build tree structure
      const categoryMap = {};
      const tree = [];

      // First pass: create map
      categories.forEach(cat => {
        categoryMap[cat._id] = {
          ...cat.toObject(),
          children: []
        };
      });

      // Second pass: build tree
      categories.forEach(cat => {
        if (cat.parent) {
          const parent = categoryMap[cat.parent];
          if (parent) {
            parent.children.push(categoryMap[cat._id]);
          }
        } else {
          tree.push(categoryMap[cat._id]);
        }
      });

      return tree;
    } catch (error) {
      logger.error('Get category tree error:', error);
      throw error;
    }
  }
}
