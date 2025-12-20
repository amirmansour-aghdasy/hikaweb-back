import { Article } from './model.js';
import { ArticleView } from './articleViewModel.js';
import { Portfolio } from '../portfolio/model.js';
import { logger } from '../../utils/logger.js';
import { BaseService } from '../../shared/services/baseService.js';
import crypto from 'crypto';

export class ArticleService extends BaseService {
  constructor() {
    super(Article, {
      cachePrefix: 'articles',
      slugField: 'title',
      categoryType: 'article',
      populateFields: ['author', 'categories'],
      imageFields: {
        featuredImage: 'featuredImage'
      }
    });
  }
  static async createArticle(articleData, userId) {
    try {
      const service = new ArticleService();
      
      // Generate and validate slug using BaseService
      await service.generateAndValidateSlug(articleData);
      
      // Validate categories using BaseService
      await service.validateCategories(articleData.categories);

      const article = new Article({
        ...articleData,
        author: userId,
        createdBy: userId,
        publishedAt: articleData.isPublished ? new Date() : null
      });

      await article.save();
      await service.populateDocument(article);

      // Track images using BaseService
      await service.trackAllImages(article, article._id);

      // Invalidate cache using BaseService
      await service.invalidateCache(article);

      logger.info(`Article created: ${article.title.fa} by user ${userId}`);
      return article;
    } catch (error) {
      logger.error('Article creation error:', error);
      throw error;
    }
  }

  static async updateArticle(articleId, updateData, userId) {
    try {
      const service = new ArticleService();
      const article = await Article.findById(articleId);

      if (!article) {
        throw new Error('مقاله یافت نشد');
      }

      // Generate and validate slug using BaseService (exclude current article)
      if (updateData.title || updateData.slug) {
        await service.generateAndValidateSlug(updateData, articleId);
      }

      // Validate categories if provided using BaseService
      if (updateData.categories) {
        await service.validateCategories(updateData.categories);
      }

      // Handle publish status change
      if (updateData.hasOwnProperty('isPublished')) {
        if (updateData.isPublished && !article.isPublished) {
          updateData.publishedAt = new Date();
        } else if (!updateData.isPublished && article.isPublished) {
          updateData.publishedAt = null;
        }
      }

      // Track image usage changes using BaseService
      if (updateData.featuredImage !== article.featuredImage) {
        if (article.featuredImage) {
          await service.removeImageUsage(article.featuredImage, article._id, 'featuredImage');
        }
        if (updateData.featuredImage) {
          await service.trackImageUsage(updateData.featuredImage, article._id, 'featuredImage');
        }
      }

      const oldSlug = {
        fa: article.slug?.fa,
        en: article.slug?.en
      };

      Object.assign(article, updateData);
      article.updatedBy = userId;

      await article.save();
      await service.populateDocument(article);

      // Invalidate cache using BaseService
      const slugChanged = updateData.slug && (
        updateData.slug.fa !== oldSlug.fa || 
        updateData.slug.en !== oldSlug.en
      );
      
      if (slugChanged || updateData.hasOwnProperty('isPublished')) {
        await service.invalidateCache(article, oldSlug, slugChanged);
      }

      logger.info(`Article updated: ${article.title.fa} by user ${userId}`);
      return article;
    } catch (error) {
      logger.error('Article update error:', error);
      throw error;
    }
  }

  static async deleteArticle(articleId, userId) {
    try {
      const service = new ArticleService();
      const article = await Article.findById(articleId);

      if (!article) {
        throw new Error('مقاله یافت نشد');
      }

      // Soft delete
      await article.softDelete();
      article.updatedBy = userId;
      await article.save();

      // Remove image usage tracking using BaseService
      await service.removeAllImages(article, article._id);

      // Invalidate cache using BaseService - important: slug is now free for reuse
      await service.invalidateCache(article);

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

  // Generate user identifier from IP, user agent, and browser fingerprint (similar to WordPress)
  // This allows tracking unique visitors without requiring login
  // Priority: browser fingerprint > user agent > IP (fingerprint is most reliable)
  static generateUserIdentifier(req) {
    // Include browser fingerprint if provided (from frontend) - this is the most reliable identifier
    const browserFingerprint = req.headers['x-browser-fingerprint'] || req.body?.browserFingerprint || '';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ip = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    
    // If browser fingerprint is provided, use it as primary identifier
    // This ensures consistency across sessions and different IPs (e.g., mobile networks)
    if (browserFingerprint && browserFingerprint.length > 10) {
      // Combine fingerprint with user agent for additional uniqueness
      // IP is less reliable (changes with network, VPN, etc.)
      const identifierString = `${browserFingerprint}-${userAgent}`;
      return crypto.createHash('sha256').update(identifierString).digest('hex');
    }
    
    // Fallback: use IP + User Agent (less reliable but better than nothing)
    // This is similar to how WordPress tracks unique visitors without login
    const identifierString = `${ip}-${userAgent}`;
    return crypto.createHash('sha256').update(identifierString).digest('hex');
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

        // Get actual count from ArticleView collection (more accurate)
        const actualViewsCount = await ArticleView.countDocuments({ article: articleId });
        
        // Update article view count to match actual count (ensures accuracy)
        article.views = actualViewsCount;
        await article.save();

        return {
          isNewView: true,
          views: actualViewsCount
        };
      }

      // View already exists - get actual count for accuracy
      const actualViewsCount = await ArticleView.countDocuments({ article: articleId });
      
      // Sync article.views with actual count (in case of any discrepancies)
      if (article.views !== actualViewsCount) {
        article.views = actualViewsCount;
        await article.save();
      }

      return {
        isNewView: false,
        views: actualViewsCount
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

  // Image tracking methods are now handled by BaseService
  // These static methods are kept for backward compatibility
  static async trackImageUsage(imageUrl, articleId, field) {
    const service = new ArticleService();
    return service.trackImageUsage(imageUrl, articleId, field);
  }

  static async removeImageUsage(imageUrl, articleId, field) {
    const service = new ArticleService();
    return service.removeImageUsage(imageUrl, articleId, field);
  }

  static async getArticleStats() {
    try {
      // Get stats from Article collection
      const articleStats = await Article.aggregate([
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

      // Get actual counts from ArticleView and ArticleLike collections for accuracy
      // This ensures we show the real number of unique views/likes, not just the cached count
      const { ArticleView } = await import('./articleViewModel.js');
      const { ArticleLike } = await import('./articleLikeModel.js');
      
      const actualViewsCount = await ArticleView.countDocuments();
      const actualLikesCount = await ArticleLike.countDocuments();

      return {
        ...(articleStats[0] || {
          total: 0,
          published: 0,
          draft: 0,
          featured: 0,
          totalViews: 0,
          totalLikes: 0
        }),
        // Use actual counts from view/like collections for accuracy
        // These are the real numbers from the tracking collections
        totalViews: actualViewsCount,
        totalLikes: actualLikesCount
      };
    } catch (error) {
      logger.error('Get article stats error:', error);
      return {};
    }
  }

  /**
   * Sync article views and likes counts from ArticleView and ArticleLike collections
   * This ensures accuracy by counting actual records
   */
  static async syncArticleStats(articleId = null) {
    try {
      const { ArticleView } = await import('./articleViewModel.js');
      const { ArticleLike } = await import('./articleLikeModel.js');

      if (articleId) {
        // Sync for a specific article
        const viewsCount = await ArticleView.countDocuments({ article: articleId });
        const likesCount = await ArticleLike.countDocuments({ article: articleId });

        await Article.findByIdAndUpdate(articleId, {
          views: viewsCount,
          likes: likesCount
        });

        logger.info(`Synced stats for article ${articleId}: ${viewsCount} views, ${likesCount} likes`);
        return { views: viewsCount, likes: likesCount };
      } else {
        // Sync for all articles
        const articles = await Article.find({ deletedAt: null }).select('_id');
        let synced = 0;

        for (const article of articles) {
          const viewsCount = await ArticleView.countDocuments({ article: article._id });
          const likesCount = await ArticleLike.countDocuments({ article: article._id });

          await Article.findByIdAndUpdate(article._id, {
            views: viewsCount,
            likes: likesCount
          });

          synced++;
        }

        logger.info(`Synced stats for ${synced} articles`);
        return { synced };
      }
    } catch (error) {
      logger.error('Sync article stats error:', error);
      throw error;
    }
  }
}
