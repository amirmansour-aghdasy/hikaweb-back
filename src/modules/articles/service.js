import { Article } from './model.js';
import { ArticleView } from './articleViewModel.js';
import { Portfolio } from '../portfolio/model.js';
import { Category } from '../categories/model.js';
import { logger } from '../../utils/logger.js';
import { BaseService } from '../../shared/services/baseService.js';
import crypto from 'crypto';

// Premium article categories (articles in these categories are automatically premium)
const PREMIUM_CATEGORY_NAMES = [
  'ایده کسب و کار',
  'استراتژی کسب و کار',
  'business-idea',
  'business-strategy'
];

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
  /**
   * Check if article belongs to premium categories
   * @param {Array} categoryIds - Array of category IDs
   * @returns {Promise<Boolean>}
   */
  static async checkIsPremiumCategory(categoryIds) {
    if (!categoryIds || categoryIds.length === 0) {
      return false;
    }

    try {
      const categories = await Category.find({
        _id: { $in: categoryIds },
        deletedAt: null
      }).select('name slug');

      // Check if any category name or slug matches premium categories
      return categories.some(category => {
        const nameFa = category.name?.fa?.toLowerCase() || '';
        const nameEn = category.name?.en?.toLowerCase() || '';
        const slugFa = category.slug?.fa?.toLowerCase() || '';
        const slugEn = category.slug?.en?.toLowerCase() || '';

        return PREMIUM_CATEGORY_NAMES.some(premiumName => {
          const premiumLower = premiumName.toLowerCase();
          return nameFa.includes(premiumLower) || 
                 nameEn.includes(premiumLower) || 
                 slugFa.includes(premiumLower) || 
                 slugEn.includes(premiumLower);
        });
      });
    } catch (error) {
      logger.error('Error checking premium categories:', error);
      return false;
    }
  }

  static async createArticle(articleData, userId) {
    try {
      const service = new ArticleService();
      
      // Generate and validate slug using BaseService
      await service.generateAndValidateSlug(articleData);
      
      // Validate categories using BaseService
      await service.validateCategories(articleData.categories);

      // Auto-set isPremium based on categories
      // Only set if not explicitly provided in articleData
      if (!articleData.hasOwnProperty('isPremium') && articleData.categories) {
        const isPremiumCategory = await ArticleService.checkIsPremiumCategory(articleData.categories);
        articleData.isPremium = isPremiumCategory;
      }

      // If article is premium and no relatedProduct is provided, create a product automatically
      if (articleData.isPremium && !articleData.relatedProduct) {
        const { ProductService } = await import('../products/service.js');
        
        // Generate SKU for the product
        const sku = `ART-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        
        // Create product data based on article
        const productData = {
          name: {
            fa: articleData.title?.fa || articleData.title || 'محصول مقاله',
            en: articleData.title?.en || articleData.title || 'Article Product'
          },
          slug: {
            fa: articleData.slug?.fa || articleData.slug || '',
            en: articleData.slug?.en || articleData.slug || ''
          },
          sku: sku,
          type: 'digital',
          digitalProduct: {
            contentType: 'article'
          },
          shortDescription: {
            fa: articleData.excerpt?.fa || articleData.excerpt || '',
            en: articleData.excerpt?.en || articleData.excerpt || ''
          },
          description: {
            fa: articleData.content?.fa || articleData.content || '',
            en: articleData.content?.en || articleData.content || ''
          },
          featuredImage: articleData.featuredImage || '',
          pricing: {
            basePrice: 0, // Default price, should be set by admin
            isOnSale: false
          },
          inventory: {
            quantity: null, // Unlimited for digital products
            trackInventory: false,
            allowBackorder: true
          },
          isPublished: articleData.isPublished || false,
          status: 'active'
        };

        // Create the product
        const product = await ProductService.createProduct(productData, userId);
        articleData.relatedProduct = product._id;
        
        logger.info(`Auto-created product for premium article: ${product.name.fa}`);
      }

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
        
        // Auto-update isPremium based on categories if not explicitly set
        if (!updateData.hasOwnProperty('isPremium')) {
          const isPremiumCategory = await ArticleService.checkIsPremiumCategory(updateData.categories);
          updateData.isPremium = isPremiumCategory;
        }
      } else if (!updateData.hasOwnProperty('isPremium') && article.categories) {
        // If categories not updated but isPremium not set, re-check existing categories
        const isPremiumCategory = await ArticleService.checkIsPremiumCategory(article.categories);
        updateData.isPremium = isPremiumCategory;
      }

      // Handle publish status change
      if (updateData.hasOwnProperty('isPublished')) {
        if (updateData.isPublished && !article.isPublished) {
          updateData.publishedAt = new Date();
        } else if (!updateData.isPublished && article.isPublished) {
          updateData.publishedAt = null;
        }
      }

      // If article is being set to premium and no relatedProduct exists, create one
      if (updateData.isPremium && !updateData.relatedProduct && !article.relatedProduct) {
        const { ProductService } = await import('../products/service.js');
        
        // Generate SKU for the product
        const sku = `ART-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        
        // Create product data based on article
        const productData = {
          name: {
            fa: article.title?.fa || article.title || 'محصول مقاله',
            en: article.title?.en || article.title || 'Article Product'
          },
          slug: {
            fa: article.slug?.fa || article.slug || '',
            en: article.slug?.en || article.slug || ''
          },
          sku: sku,
          type: 'digital',
          digitalProduct: {
            contentType: 'article'
          },
          shortDescription: {
            fa: article.excerpt?.fa || article.excerpt || '',
            en: article.excerpt?.en || article.excerpt || ''
          },
          description: {
            fa: article.content?.fa || article.content || '',
            en: article.content?.en || article.content || ''
          },
          featuredImage: article.featuredImage || '',
          pricing: {
            basePrice: 0, // Default price, should be set by admin
            isOnSale: false
          },
          inventory: {
            quantity: null, // Unlimited for digital products
            trackInventory: false,
            allowBackorder: true
          },
          isPublished: article.isPublished || false,
          status: 'active'
        };

        // Create the product
        const product = await ProductService.createProduct(productData, userId);
        updateData.relatedProduct = product._id;
        
        logger.info(`Auto-created product for premium article: ${product.name.fa}`);
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

  /**
   * Check if user has purchased the article (via related product)
   * @param {string} articleId - Article ID
   * @param {string} userId - User ID
   * @returns {Promise<Boolean>}
   */
  static async hasUserPurchasedArticle(articleId, userId) {
    if (!userId || !articleId) {
      return false;
    }

    try {
      const article = await Article.findById(articleId).select('relatedProduct');
      if (!article || !article.relatedProduct) {
        return false;
      }

      const { Order } = await import('../orders/model.js');
      
      // Check if user has a completed/delivered order containing the related product
      // For digital products, 'delivered' status means purchase is complete
      const order = await Order.findOne({
        user: userId,
        'items.product': article.relatedProduct,
        status: { $in: ['delivered', 'processing', 'shipped'] }, // All paid statuses count as purchased
        'payment.status': 'completed',
        deletedAt: null
      });

      return !!order;
    } catch (error) {
      logger.error('Error checking article purchase:', error);
      return false;
    }
  }

  /**
   * Get count of unique buyers for an article (via related product)
   * @param {string} articleId - Article ID
   * @returns {Promise<number>} Count of unique buyers
   */
  static async getBuyerCount(articleId) {
    try {
      const article = await Article.findById(articleId).select('relatedProduct');
      if (!article || !article.relatedProduct) {
        return 0;
      }

      const { Order } = await import('../orders/model.js');
      
      // Count distinct users who have purchased the related product
      const buyerCount = await Order.distinct('user', {
        'items.product': article.relatedProduct,
        status: { $in: ['delivered', 'processing', 'shipped'] },
        'payment.status': 'completed',
        deletedAt: null
      });

      return buyerCount.length || 0;
    } catch (error) {
      logger.error('Error getting buyer count:', error);
      return 0;
    }
  }

  /**
   * Get preview content (20-30% of article)
   * @param {string} content - Full article content
   * @param {number} percentage - Percentage to show (default: 25)
   * @returns {string} Preview content
   */
  static getPreviewContent(content, percentage = 25) {
    if (!content) {
      return '';
    }

    // Calculate approximate character count for percentage
    const totalLength = content.length;
    const previewLength = Math.floor((totalLength * percentage) / 100);
    
    // Try to cut at a sentence boundary (prefer Persian/Farsi sentence endings)
    const sentenceEndings = /[.!?۔؟]\s+/;
    const preview = content.substring(0, previewLength);
    
    // Find last sentence ending in preview
    const lastSentenceEnd = preview.lastIndexOf('.');
    const lastQuestionMark = preview.lastIndexOf('؟');
    const lastExclamation = preview.lastIndexOf('!');
    
    const lastEnding = Math.max(lastSentenceEnd, lastQuestionMark, lastExclamation);
    
    if (lastEnding > previewLength * 0.7) {
      // If we found a sentence ending reasonably close to target, use it
      return content.substring(0, lastEnding + 1);
    }
    
    // Otherwise, try to cut at paragraph boundary
    const lastParagraph = preview.lastIndexOf('\n\n');
    if (lastParagraph > previewLength * 0.5) {
      return content.substring(0, lastParagraph);
    }
    
    // Fallback: cut at word boundary
    const lastSpace = preview.lastIndexOf(' ');
    if (lastSpace > previewLength * 0.8) {
      return content.substring(0, lastSpace);
    }
    
    // Final fallback: return exact preview length
    return preview;
  }

  static async getArticleBySlug(slug, language = 'fa', userId = null) {
    try {
      const article = await Article.findOne({
        [`slug.${language}`]: slug,
        isPublished: true,
        deletedAt: null
      })
        .populate('author', 'name email avatar')
        .populate('categories', 'name slug')
        .populate('relatedProduct', 'name slug pricing type digitalProduct');

      if (!article) {
        throw new Error('مقاله یافت نشد');
      }

      // Check if user has purchased the article
      let hasAccess = false;
      if (userId && article.isPremium && article.relatedProduct) {
        hasAccess = await ArticleService.hasUserPurchasedArticle(article._id, userId);
      } else if (!article.isPremium) {
        // Non-premium articles are always accessible
        hasAccess = true;
      }

      // Convert to object for manipulation
      const articleObj = article.toObject();

      // If article is premium and user doesn't have access, show preview only
      if (article.isPremium && !hasAccess) {
        articleObj.content = {
          fa: ArticleService.getPreviewContent(article.content?.fa || '', 25),
          en: ArticleService.getPreviewContent(article.content?.en || '', 25)
        };
        articleObj.isPreview = true;
        articleObj.hasAccess = false;
      } else {
        articleObj.isPreview = false;
        articleObj.hasAccess = true;
      }

      // Don't increment view count here - use trackView endpoint instead
      // This ensures unique view tracking

      return articleObj;
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

  /**
   * Download article digital content as ZIP
   * @param {string} articleId - Article ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} ZIP file stream and metadata
   */
  static async downloadArticleZip(articleId, userId) {
    try {
      if (!userId) {
        throw new Error('برای دانلود باید وارد شوید');
      }

      // Check if user has purchased the article
      const hasPurchased = await ArticleService.hasUserPurchasedArticle(articleId, userId);
      if (!hasPurchased) {
        throw new Error('شما این مقاله را خریداری نکرده‌اید');
      }

      // Get article with digital content
      const article = await Article.findById(articleId)
        .populate('relatedProduct', 'name slug');

      if (!article) {
        throw new Error('مقاله یافت نشد');
      }

      if (!article.digitalContent) {
        throw new Error('محتوای دیجیتال برای این مقاله موجود نیست');
      }

      const archiver = (await import('archiver')).default;
      const axios = (await import('axios')).default;
      const { Readable } = await import('stream');

      // Create ZIP archive
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      const files = [];
      const articleTitle = article.title?.fa || article.title?.en || 'article';
      const sanitizedTitle = articleTitle.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');

      // Add main PDF if exists
      if (article.digitalContent.mainPdf?.url) {
        files.push({
          url: article.digitalContent.mainPdf.url,
          name: article.digitalContent.mainPdf.fileName || `${sanitizedTitle}.pdf`,
          path: `${sanitizedTitle}.pdf`
        });
      }

      // Add videos
      if (article.digitalContent.videos && article.digitalContent.videos.length > 0) {
        article.digitalContent.videos.forEach((video, index) => {
          const videoTitle = video.title?.fa || video.title?.en || `video_${index + 1}`;
          const sanitizedVideoTitle = videoTitle.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
          const extension = video.format || 'mp4';
          files.push({
            url: video.url,
            name: `${sanitizedVideoTitle}.${extension}`,
            path: `videos/${sanitizedVideoTitle}.${extension}`
          });
        });
      }

      // Add attachments
      if (article.digitalContent.attachments && article.digitalContent.attachments.length > 0) {
        article.digitalContent.attachments.forEach((attachment, index) => {
          const attachmentTitle = attachment.title?.fa || attachment.title?.en || `attachment_${index + 1}`;
          const sanitizedAttachmentTitle = attachmentTitle.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
          const fileName = attachment.fileName || `${sanitizedAttachmentTitle}.pdf`;
          files.push({
            url: attachment.url,
            name: fileName,
            path: `attachments/${fileName}`
          });
        });
      }

      if (files.length === 0) {
        throw new Error('فایلی برای دانلود موجود نیست');
      }

      // Download files and add to ZIP
      for (const file of files) {
        try {
          const response = await axios.get(file.url, {
            responseType: 'stream',
            timeout: 30000 // 30 seconds timeout
          });

          archive.append(response.data, { name: file.path });
        } catch (downloadError) {
          logger.error(`Error downloading file ${file.url}:`, downloadError);
          // Continue with other files even if one fails
        }
      }

      // Finalize archive
      archive.finalize();

      logger.info(`Article ZIP download initiated: ${articleId}, user: ${userId}, files: ${files.length}`);

      return {
        stream: archive,
        filename: `${sanitizedTitle}_${Date.now()}.zip`,
        filesCount: files.length
      };
    } catch (error) {
      logger.error('Download article ZIP error:', error);
      throw error;
    }
  }
}
