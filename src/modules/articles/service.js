import { Article } from './model.js';
import { ArticleView } from './articleViewModel.js';
import { Category } from '../categories/model.js';
import { Media } from '../media/model.js';
import { Portfolio } from '../portfolio/model.js';
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';

export class ArticleService {
  static async createArticle(articleData, userId) {
    try {
      // Check for duplicate slugs
      const existingSlugs = await Article.find({
        $or: [{ 'slug.fa': articleData.slug.fa }, { 'slug.en': articleData.slug.en }],
        deletedAt: null
      });

      if (existingSlugs.length > 0) {
        throw new Error('این آدرس یکتا قبلاً استفاده شده است');
      }

      // Validate categories exist
      if (articleData.categories && articleData.categories.length > 0) {
        const categoriesCount = await Category.countDocuments({
          _id: { $in: articleData.categories },
          type: 'article',
          deletedAt: null
        });

        if (categoriesCount !== articleData.categories.length) {
          throw new Error('برخی از دسته‌بندی‌های انتخابی نامعتبر هستند');
        }
      }

      const article = new Article({
        ...articleData,
        author: userId,
        createdBy: userId,
        publishedAt: articleData.isPublished ? new Date() : null
      });

      await article.save();
      await article.populate(['author', 'categories']);

      // Track featured image usage
      if (article.featuredImage) {
        await this.trackImageUsage(article.featuredImage, article._id, 'featuredImage');
      }

      logger.info(`Article created: ${article.title.fa} by user ${userId}`);
      return article;
    } catch (error) {
      logger.error('Article creation error:', error);
      throw error;
    }
  }

  static async updateArticle(articleId, updateData, userId) {
    try {
      const article = await Article.findById(articleId);

      if (!article) {
        throw new Error('مقاله یافت نشد');
      }

      // Check slug uniqueness if changed
      if (updateData.slug) {
        const existingSlugs = await Article.find({
          _id: { $ne: articleId },
          $or: [{ 'slug.fa': updateData.slug.fa }, { 'slug.en': updateData.slug.en }],
          deletedAt: null
        });

        if (existingSlugs.length > 0) {
          throw new Error('این آدرس یکتا قبلاً استفاده شده است');
        }
      }

      // Validate categories if provided
      if (updateData.categories) {
        const categoriesCount = await Category.countDocuments({
          _id: { $in: updateData.categories },
          type: 'article',
          deletedAt: null
        });

        if (categoriesCount !== updateData.categories.length) {
          throw new Error('برخی از دسته‌بندی‌های انتخابی نامعتبر هستند');
        }
      }

      // Handle publish status change
      if (updateData.hasOwnProperty('isPublished')) {
        if (updateData.isPublished && !article.isPublished) {
          updateData.publishedAt = new Date();
        } else if (!updateData.isPublished && article.isPublished) {
          updateData.publishedAt = null;
        }
      }

      // Track image usage changes
      if (updateData.featuredImage !== article.featuredImage) {
        // Remove old image tracking
        if (article.featuredImage) {
          await this.removeImageUsage(article.featuredImage, article._id, 'featuredImage');
        }
        // Add new image tracking
        if (updateData.featuredImage) {
          await this.trackImageUsage(updateData.featuredImage, article._id, 'featuredImage');
        }
      }

      Object.assign(article, updateData);
      article.updatedBy = userId;

      await article.save();
      await article.populate(['author', 'categories']);

      logger.info(`Article updated: ${article.title.fa} by user ${userId}`);
      return article;
    } catch (error) {
      logger.error('Article update error:', error);
      throw error;
    }
  }

  static async deleteArticle(articleId, userId) {
    try {
      const article = await Article.findById(articleId);

      if (!article) {
        throw new Error('مقاله یافت نشد');
      }

      // Soft delete
      await article.softDelete();
      article.updatedBy = userId;
      await article.save();

      // Remove image usage tracking
      if (article.featuredImage) {
        await this.removeImageUsage(article.featuredImage, article._id, 'featuredImage');
      }

      logger.info(`Article deleted: ${article.title.fa} by user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Article deletion error:', error);
      throw error;
    }
  }

  static async getArticles(filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 25,
        search = '',
        category = '',
        author = '',
        isPublished,
        isFeatured,
        language = 'fa',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      const parsedPage = parseInt(page) || 1;
      const parsedLimit = parseInt(limit) || 25;

      let query = { deletedAt: null };

      // Search in title and content
      // Filter out 'undefined' string and empty values
      if (search && search !== 'undefined' && search.trim() !== '') {
        query.$or = [
          { [`title.${language}`]: new RegExp(search, 'i') },
          { [`content.${language}`]: new RegExp(search, 'i') },
          { [`tags.${language}`]: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      // Filter by category
      // Filter out 'undefined' string, empty values, and validate ObjectId format
      if (category && category !== 'undefined' && category !== 'all' && category.trim() !== '') {
        // Validate ObjectId format (24 hex characters)
        const objectIdPattern = /^[0-9a-fA-F]{24}$/;
        if (objectIdPattern.test(category)) {
          query.categories = { $in: [category] };
        }
      }

      // Filter by author
      if (author) {
        query.author = author;
      }

      // Filter by published status
      // Handle both boolean and string values from query params
      if (isPublished !== undefined && isPublished !== null && isPublished !== '') {
        // Convert string to boolean if needed
        const publishedValue = typeof isPublished === 'string' 
          ? isPublished === 'true' || isPublished === '1'
          : Boolean(isPublished);
        query.isPublished = publishedValue;
      }

      // Filter by featured status
      if (typeof isFeatured === 'boolean') {
        query.isFeatured = isFeatured;
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (parsedPage - 1) * parsedLimit;

      const [articles, total] = await Promise.all([
        Article.find(query)
          .populate('author', 'name email avatar')
          .populate('categories', 'name slug')
          .sort(sortOptions)
          .skip(skip)
          .limit(parsedLimit),
        Article.countDocuments(query)
      ]);

      return {
        data: articles,
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
      logger.error('Get articles error:', error);
      throw error;
    }
  }

  static async getArticleBySlug(slug, language = 'fa') {
    try {
      const article = await Article.findOne({
        [`slug.${language}`]: slug,
        isPublished: true,
        deletedAt: null
      })
        .populate('author', 'name email avatar')
        .populate('categories', 'name slug');

      if (!article) {
        throw new Error('مقاله یافت نشد');
      }

      // Don't increment view count here - use trackView endpoint instead
      // This ensures unique view tracking

      return article;
    } catch (error) {
      logger.error('Get article by slug error:', error);
      throw error;
    }
  }

  // Generate user identifier from IP and user agent (same as ArticleRatingService)
  static generateUserIdentifier(req) {
    const ip = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return crypto.createHash('sha256').update(`${ip}-${userAgent}`).digest('hex');
  }

  // Track unique view for an article
  static async trackView(articleId, userIdentifier, userId = null, ip = null, userAgent = null) {
    try {
      const article = await Article.findById(articleId);
      if (!article || article.deletedAt) {
        throw new Error('مقاله یافت نشد');
      }

      // Check if view already exists
      const existingView = await ArticleView.findOne({ 
        article: articleId, 
        userIdentifier 
      });

      if (!existingView) {
        // Create new view record
        const viewDoc = new ArticleView({
          article: articleId,
          userIdentifier,
          user: userId || null,
          ip: ip || null,
          userAgent: userAgent || null
        });
        await viewDoc.save();

        // Increment article view count
        article.views += 1;
        await article.save();

        return {
          isNewView: true,
          views: article.views
        };
      }

      // View already exists - return current count
      return {
        isNewView: false,
        views: article.views
      };
    } catch (error) {
      // If duplicate key error (race condition), just return current count
      if (error.code === 11000) {
        const article = await Article.findById(articleId);
        return {
          isNewView: false,
          views: article?.views || 0
        };
      }
      logger.error('Track article view error:', error);
      throw error;
    }
  }

  static async getRelatedArticles(articleId, limit = 5) {
    try {
      const article = await Article.findById(articleId);

      if (!article) {
        return [];
      }

      const relatedArticles = await Article.find({
        _id: { $ne: articleId },
        categories: { $in: article.categories },
        isPublished: true,
        deletedAt: null
      })
        .populate('author', 'name avatar')
        .populate('categories', 'name')
        .sort({ views: -1, createdAt: -1 })
        .limit(limit);

      return relatedArticles;
    } catch (error) {
      logger.error('Get related articles error:', error);
      return [];
    }
  }

  static async getRelatedVideos(articleId, limit = 4) {
    try {
      const article = await Article.findById(articleId);

      if (!article) {
        return [];
      }

      // Get portfolios with videos that share categories or services with the article
      // Since articles have categories, we'll match portfolios by categories
      const relatedVideos = await Portfolio.find({
        categories: { $in: article.categories },
        'gallery.type': 'video',
        deletedAt: null
      })
        .populate('services', 'name')
        .populate('categories', 'name')
        .sort({ views: -1, 'project.completedAt': -1 })
        .limit(limit)
        .select('title slug featuredImage gallery shortDescription views');

      // Filter to only include portfolios that have at least one video
      return relatedVideos.filter(portfolio => 
        portfolio.gallery && portfolio.gallery.some(item => item.type === 'video')
      );
    } catch (error) {
      logger.error('Get related videos error:', error);
      return [];
    }
  }

  static async getRelatedPortfolios(articleId, limit = 4) {
    try {
      const article = await Article.findById(articleId);

      if (!article) {
        return [];
      }

      // Get portfolios that share categories with the article
      const relatedPortfolios = await Portfolio.find({
        categories: { $in: article.categories },
        deletedAt: null
      })
        .populate('services', 'name')
        .populate('categories', 'name')
        .sort({ views: -1, 'project.completedAt': -1 })
        .limit(limit);

      return relatedPortfolios;
    } catch (error) {
      logger.error('Get related portfolios error:', error);
      return [];
    }
  }

  static async getFeaturedArticles(limit = 6) {
    try {
      const articles = await Article.find({
        isFeatured: true,
        isPublished: true,
        deletedAt: null
      })
        .populate('author', 'name avatar')
        .populate('categories', 'name')
        .sort({ publishedAt: -1 })
        .limit(limit);

      return articles;
    } catch (error) {
      logger.error('Get featured articles error:', error);
      return [];
    }
  }

  static async getPopularArticles(limit = 5) {
    try {
      const articles = await Article.find({
        isPublished: true,
        deletedAt: null,
        views: { $gt: 0 }
      })
        .populate('author', 'name avatar')
        .populate('categories', 'name')
        .sort({ views: -1, publishedAt: -1 })
        .limit(limit);

      return articles;
    } catch (error) {
      logger.error('Get popular articles error:', error);
      return [];
    }
  }

  static async trackImageUsage(imageUrl, articleId, field) {
    try {
      const media = await Media.findOne({ url: imageUrl });
      if (media) {
        await media.trackUsage('Article', articleId, field);
      }
    } catch (error) {
      logger.error('Track image usage error:', error);
    }
  }

  static async removeImageUsage(imageUrl, articleId, field) {
    try {
      const media = await Media.findOne({ url: imageUrl });
      if (media) {
        await media.removeUsage('Article', articleId, field);
      }
    } catch (error) {
      logger.error('Remove image usage error:', error);
    }
  }

  static async getArticleStats() {
    try {
      const stats = await Article.aggregate([
        {
          $match: { deletedAt: null }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            published: {
              $sum: {
                $cond: [{ $eq: ['$isPublished', true] }, 1, 0]
              }
            },
            draft: {
              $sum: {
                $cond: [{ $eq: ['$isPublished', false] }, 1, 0]
              }
            },
            featured: {
              $sum: {
                $cond: [{ $eq: ['$isFeatured', true] }, 1, 0]
              }
            },
            totalViews: { $sum: '$views' },
            totalLikes: { $sum: '$likes' }
          }
        }
      ]);

      return (
        stats[0] || {
          total: 0,
          published: 0,
          draft: 0,
          featured: 0,
          totalViews: 0,
          totalLikes: 0
        }
      );
    } catch (error) {
      logger.error('Get article stats error:', error);
      return {};
    }
  }
}
