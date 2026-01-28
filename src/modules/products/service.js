import { Product } from './model.js';
import { logger } from '../../utils/logger.js';
import { BaseService } from '../../shared/services/baseService.js';

/**
 * ProductService - Service layer for product operations
 * 
 * Features:
 * - CRUD operations
 * - Price history tracking
 * - Inventory management
 * - Rating calculations
 * - Related content management
 */
export class ProductService extends BaseService {
  constructor() {
    super(Product, {
      cachePrefix: 'products',
      slugField: 'name',
      categoryType: 'product',
      populateFields: ['categories'],
      imageFields: {
        featuredImage: 'featuredImage',
        gallery: 'gallery'
      }
    });
  }

  /**
   * Create new product
   */
  static async createProduct(productData, userId) {
    try {
      const service = new ProductService();
      
      // Generate and validate slug
      await service.generateAndValidateSlug(productData);
      
      // Validate categories
      if (productData.categories && productData.categories.length > 0) {
        await service.validateCategories(productData.categories);
      }
      
      // Generate SKU if not provided
      if (!productData.sku) {
        productData.sku = await this._generateSKU(productData.name?.fa || productData.name?.en || 'PROD');
      }
      
      // Set initial price in history
      if (productData.pricing?.basePrice) {
        productData.pricing.priceHistory = [{
          price: productData.pricing.basePrice,
          date: new Date(),
          reason: 'initial'
        }];
      }
      
      // Update stock status
      const product = new Product({
        ...productData,
        createdBy: userId
      });
      
      if (product.type === 'physical') {
        product.updateStockStatus();
      }
      
      await product.save();
      await service.populateDocument(product);
      
      // Track images
      await service.trackAllImages(product, product._id);
      
      // Invalidate cache
      await service.invalidateCache(product);
      
      logger.info(`Product created: ${product.name.fa} by user ${userId}`);
      return product;
    } catch (error) {
      logger.error('Product creation error:', error);
      throw error;
    }
  }

  /**
   * Update product
   */
  static async updateProduct(productId, updateData, userId) {
    try {
      const service = new ProductService();
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('محصول یافت نشد');
      }
      
      // Generate slug if name changed
      if (updateData.name && (!updateData.slug || !updateData.slug.fa || !updateData.slug.en)) {
        await service.generateAndValidateSlug(updateData, productId);
      }
      
      // Validate categories
      if (updateData.categories) {
        await service.validateCategories(updateData.categories);
      }
      
      // Track price changes
      if (updateData.pricing?.basePrice && updateData.pricing.basePrice !== product.pricing.basePrice) {
        const oldPrice = product.pricing.basePrice;
        const newPrice = updateData.pricing.basePrice;
        
        // Add to price history
        product.addPriceToHistory(newPrice, 'update');
        updateData.pricing.priceHistory = product.pricing.priceHistory;
      }
      
      // Update fields
      Object.assign(product, updateData);
      product.updatedBy = userId;
      
      // Update stock status if inventory changed
      if (updateData.inventory || product.type === 'physical') {
        product.updateStockStatus();
      }
      
      await product.save();
      await service.populateDocument(product);
      
      // Track images
      if (updateData.featuredImage || updateData.gallery) {
        await service.trackAllImages(product, product._id);
      }
      
      // Invalidate cache
      await service.invalidateCache(product);
      
      logger.info(`Product updated: ${product.name.fa} by user ${userId}`);
      return product;
    } catch (error) {
      logger.error('Product update error:', error);
      throw error;
    }
  }

  /**
   * Delete product (soft delete)
   */
  static async deleteProduct(productId, userId) {
    try {
      const service = new ProductService();
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('محصول یافت نشد');
      }
      
      await product.softDelete(userId);
      
      // Remove image usage tracking
      await service.removeAllImages(product, product._id);
      
      // Invalidate cache
      await service.invalidateCache(product);
      
      logger.info(`Product deleted: ${product.name.fa} by user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Product deletion error:', error);
      throw error;
    }
  }

  /**
   * Get products with filters
   */
  static async getProducts(filters = {}) {
    try {
      const {
        page = 1,
        limit = 25,
        search = '',
        category = '',
        type = '', // 'digital' or 'physical'
        status = 'active',
        isPublished = true,
        isFeatured,
        minPrice,
        maxPrice,
        inStock,
        isOnSale,
        language = 'fa',
        sortBy = 'createdAt',
        sortOrder = 'desc',
        digitalProduct // Handle bracket notation: digitalProduct[contentType]
      } = filters;

      const parsedPage = parseInt(page) || 1;
      const parsedLimit = Math.min(parseInt(limit) || 25, 100); // Max 100 per page

      let query = { deletedAt: null };

      // Status filter
      if (status && ['active', 'inactive', 'archived'].includes(status)) {
        query.status = status;
      }

      // Published filter
      if (isPublished !== undefined && isPublished !== null && isPublished !== '') {
        const publishedValue = typeof isPublished === 'string' 
          ? isPublished === 'true' || isPublished === '1'
          : Boolean(isPublished);
        query.isPublished = publishedValue;
      }

      // Build $and array for complex conditions
      const andConditions = [];

      // Search
      if (search && search.trim() !== '') {
        andConditions.push({
          $or: [
            { [`name.${language}`]: new RegExp(search, 'i') },
            { [`description.${language}`]: new RegExp(search, 'i') },
            { [`shortDescription.${language}`]: new RegExp(search, 'i') },
            { sku: new RegExp(search, 'i') },
            { [`tags.${language}`]: { $in: [new RegExp(search, 'i')] } }
          ]
        });
      }

      // Stock filter
      if (inStock === true || inStock === 'true') {
        andConditions.push({
          $or: [
            { type: 'digital' }, // Digital products are always "in stock"
            { 
              type: 'physical',
              $or: [
                { 'inventory.trackInventory': false },
                { 'inventory.quantity': { $gt: 0 } },
                { 'inventory.allowBackorder': true }
              ]
            }
          ]
        });
      }

      // Category filter
      if (category && category !== 'all' && category.trim() !== '') {
        const objectIdPattern = /^[0-9a-fA-F]{24}$/;
        if (objectIdPattern.test(category)) {
          query.categories = { $in: [category] };
        }
      }

      // Type filter
      if (type && ['digital', 'physical'].includes(type)) {
        query.type = type;
      }

      // Digital product contentType filter (for article products)
      // Handle both bracket notation (digitalProduct[contentType]) and dot notation (digitalProduct.contentType)
      const contentType = digitalProduct?.contentType || filters['digitalProduct.contentType'];
      if (contentType && type === 'digital') {
        query['digitalProduct.contentType'] = contentType;
      }

      // Price range filter
      if (minPrice !== undefined || maxPrice !== undefined) {
        query['pricing.basePrice'] = {};
        if (minPrice !== undefined) {
          query['pricing.basePrice'].$gte = parseFloat(minPrice);
        }
        if (maxPrice !== undefined) {
          query['pricing.basePrice'].$lte = parseFloat(maxPrice);
        }
      }

      // On Sale filter
      if (isOnSale === true || isOnSale === 'true') {
        const now = new Date();
        // Products on sale: isOnSale must be true
        // If saleStartDate exists and is not null, it must be <= now
        // If saleEndDate exists and is not null, it must be >= now
        // If dates don't exist or are null, just check isOnSale
        query['pricing.isOnSale'] = true;
        
        // Build date conditions - match the logic in getCurrentPrice method
        // Product is on sale if:
        // 1. isOnSale is true (already set above)
        // 2. saleStartDate is null/undefined OR saleStartDate <= now
        // 3. saleEndDate is null/undefined OR saleEndDate >= now
        const saleDateConditions = {
          $and: [
            {
              $or: [
                { 'pricing.saleStartDate': null },
                { 'pricing.saleStartDate': { $exists: false } },
                { 'pricing.saleStartDate': { $lte: now } }
              ]
            },
            {
              $or: [
                { 'pricing.saleEndDate': null },
                { 'pricing.saleEndDate': { $exists: false } },
                { 'pricing.saleEndDate': { $gte: now } }
              ]
            }
          ]
        };
        
        // Add to andConditions array
        andConditions.push(saleDateConditions);
      }

      // Apply $and if we have complex conditions
      if (andConditions.length > 0) {
        query.$and = andConditions;
      }

      // Featured filter
      if (typeof isFeatured === 'boolean') {
        query.isFeatured = isFeatured;
      }

      // Sort options
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (parsedPage - 1) * parsedLimit;

      const [products, total] = await Promise.all([
        Product.find(query)
          .populate('categories', 'name slug')
          .sort(sortOptions)
          .skip(skip)
          .limit(parsedLimit)
          .lean(), // Use lean for better performance
        Product.countDocuments(query)
      ]);

      // Get likes and bookmarks count for all products in one query
      if (products.length > 0) {
        const { ProductLike } = await import('../productLikes/model.js');
        const productIds = products.map(p => p._id);
        
        // Aggregate likes count for all products at once
        const likesCounts = await ProductLike.aggregate([
          {
            $match: {
              product: { $in: productIds },
              deletedAt: null
            }
          },
          {
            $group: {
              _id: '$product',
              count: { $sum: 1 }
            }
          }
        ]);

        // Create a map for quick lookup
        const likesMap = new Map(
          likesCounts.map(item => [item._id.toString(), item.count])
        );

        // Aggregate bookmarks count for all products at once
        let bookmarksMap = new Map();
        try {
          const { ProductBookmark } = await import('../productBookmarks/model.js');
          const bookmarksCounts = await ProductBookmark.aggregate([
            {
              $match: {
                product: { $in: productIds },
                deletedAt: null
              }
            },
            {
              $group: {
                _id: '$product',
                count: { $sum: 1 }
              }
            }
          ]);

          bookmarksMap = new Map(
            bookmarksCounts.map(item => [item._id.toString(), item.count])
          );
        } catch (bookmarkError) {
          // If ProductBookmark model doesn't exist or error, continue without bookmarks
          logger.debug('Bookmarks aggregation skipped:', bookmarkError.message);
        }

        // Add likes and bookmarks count to each product
        products.forEach(product => {
          product.likes = likesMap.get(product._id.toString()) || 0;
          product.bookmarks = bookmarksMap.get(product._id.toString()) || 0;
        });
      }

      return {
        data: products,
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
      logger.error('Get products error:', error);
      throw error;
    }
  }

  /**
   * Get product by slug
   */
  static async getProductBySlug(slug, language = 'fa') {
    try {
      const product = await Product.findOne({
        [`slug.${language}`]: slug,
        deletedAt: null,
        status: 'active',
        isPublished: true
      })
        .populate('categories', 'name slug')
        .populate('relatedProducts', 'name slug featuredImage pricing')
        .populate('relatedArticles', 'title slug featuredImage')
        .populate('relatedServices', 'name slug featuredImage')
        .populate('relatedVideos', 'title slug thumbnailUrl');

      if (!product) {
        throw new Error('محصول یافت نشد');
      }

      // If no related content, find based on categories and tags
      if ((!product.relatedProducts || product.relatedProducts.length === 0) ||
          (!product.relatedArticles || product.relatedArticles.length === 0) ||
          (!product.relatedServices || product.relatedServices.length === 0) ||
          (!product.relatedVideos || product.relatedVideos.length === 0)) {
        
        const relatedContent = await this.getRelatedContentByCategoriesAndTags(
          product._id,
          product.categories,
          product.tags?.[language] || product.tags?.fa || [],
          language
        );

        // Merge with existing related content
        if (!product.relatedProducts || product.relatedProducts.length === 0) {
          product.relatedProducts = relatedContent.products || [];
        }
        if (!product.relatedArticles || product.relatedArticles.length === 0) {
          product.relatedArticles = relatedContent.articles || [];
        }
        if (!product.relatedServices || product.relatedServices.length === 0) {
          product.relatedServices = relatedContent.services || [];
        }
        if (!product.relatedVideos || product.relatedVideos.length === 0) {
          product.relatedVideos = relatedContent.videos || [];
        }
      }

      // Increment views
      product.views += 1;
      await product.save();

      return product;
    } catch (error) {
      logger.error('Get product by slug error:', error);
      throw error;
    }
  }

  /**
   * Get related content based on categories and tags
   */
  static async getRelatedContentByCategoriesAndTags(productId, categories = [], tags = [], language = 'fa') {
    try {
      const { Article } = await import('../articles/model.js');
      const { Service } = await import('../services/model.js');
      const { Video } = await import('../videos/model.js');

      const categoryIds = categories.map(c => c._id || c).filter(Boolean);
      const limit = 4;

      const [products, articles, services, videos] = await Promise.all([
        // Related products
        categoryIds.length > 0
          ? Product.find({
              _id: { $ne: productId },
              categories: { $in: categoryIds },
              deletedAt: null,
              status: 'active',
              isPublished: true
            })
              .select('name slug featuredImage pricing')
              .limit(limit)
              .lean()
          : [],

        // Related articles
        categoryIds.length > 0
          ? Article.find({
              categories: { $in: categoryIds },
              deletedAt: null,
              status: 'published'
            })
              .select('title slug featuredImage')
              .limit(limit)
              .lean()
          : [],

        // Related services
        categoryIds.length > 0
          ? Service.find({
              categories: { $in: categoryIds },
              deletedAt: null,
              status: 'active'
            })
              .select('name slug featuredImage')
              .limit(limit)
              .lean()
          : [],

        // Related videos
        categoryIds.length > 0
          ? Video.find({
              categories: { $in: categoryIds },
              deletedAt: null,
              status: 'published'
            })
              .select('title slug thumbnailUrl')
              .limit(limit)
              .lean()
          : []
      ]);

      return {
        products: products || [],
        articles: articles || [],
        services: services || [],
        videos: videos || []
      };
    } catch (error) {
      logger.error('Get related content error:', error);
      return {
        products: [],
        articles: [],
        services: [],
        videos: []
      };
    }
  }

  /**
   * Get product by ID
   */
  static async getProductById(productId) {
    try {
      const product = await Product.findOne({
        _id: productId,
        deletedAt: null
      })
        .populate('categories', 'name slug')
        .populate('relatedProducts', 'name slug featuredImage pricing')
        .populate('relatedArticles', 'title slug featuredImage')
        .populate('relatedServices', 'name slug featuredImage')
        .populate('relatedVideos', 'title slug thumbnailUrl');

      if (!product) {
        throw new Error('محصول یافت نشد');
      }

      return product;
    } catch (error) {
      logger.error('Get product by ID error:', error);
      throw error;
    }
  }

  /**
   * Get products on sale
   */
  static async getProductsOnSale(filters = {}) {
    try {
      const now = new Date();
      const query = {
        deletedAt: null,
        status: 'active',
        isPublished: true,
        'pricing.isOnSale': true,
        'pricing.saleStartDate': { $lte: now },
        'pricing.saleEndDate': { $gte: now }
      };

      const { page = 1, limit = 25, language = 'fa' } = filters;
      const parsedPage = parseInt(page) || 1;
      const parsedLimit = parseInt(limit) || 25;
      const skip = (parsedPage - 1) * parsedLimit;

      const [products, total] = await Promise.all([
        Product.find(query)
          .populate('categories', 'name slug')
          .sort({ 'pricing.saleStartDate': -1 })
          .skip(skip)
          .limit(parsedLimit),
        Product.countDocuments(query)
      ]);

      return {
        data: products,
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
      logger.error('Get products on sale error:', error);
      throw error;
    }
  }

  /**
   * Update product rating
   */
  static async updateRating(productId, rating) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('محصول یافت نشد');
      }

      product.updateRating(rating);
      await product.save();

      return product;
    } catch (error) {
      logger.error('Update product rating error:', error);
      throw error;
    }
  }

  /**
   * Subscribe to product notifications
   */
  static async subscribeToNotifications(productId, userId, channels = {}) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('محصول یافت نشد');
      }

      // Check if already subscribed
      const existingIndex = product.notificationSubscribers.findIndex(
        sub => sub.user.toString() === userId.toString()
      );

      if (existingIndex !== -1) {
        // Update existing subscription
        product.notificationSubscribers[existingIndex].channels = {
          email: channels.email ?? true,
          sms: channels.sms ?? false,
          web: channels.web ?? true
        };
        product.notificationSubscribers[existingIndex].subscribedAt = new Date();
      } else {
        // Add new subscription
        product.notificationSubscribers.push({
          user: userId,
          channels: {
            email: channels.email ?? true,
            sms: channels.sms ?? false,
            web: channels.web ?? true
          },
          subscribedAt: new Date()
        });
      }

      await product.save();
      return product;
    } catch (error) {
      logger.error('Subscribe to notifications error:', error);
      throw error;
    }
  }

  /**
   * Check if user is subscribed to product notifications
   */
  static async checkSubscriptionStatus(productId, userId) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('محصول یافت نشد');
      }

      const subscription = product.notificationSubscribers.find(
        sub => sub.user.toString() === userId.toString()
      );

      return {
        isSubscribed: !!subscription,
        channels: subscription?.channels || null,
        subscribedAt: subscription?.subscribedAt || null
      };
    } catch (error) {
      logger.error('Check subscription status error:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from product notifications
   */
  static async unsubscribeFromNotifications(productId, userId) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('محصول یافت نشد');
      }

      product.notificationSubscribers = product.notificationSubscribers.filter(
        sub => sub.user.toString() !== userId.toString()
      );

      await product.save();
      return product;
    } catch (error) {
      logger.error('Unsubscribe from notifications error:', error);
      throw error;
    }
  }

  /**
   * Private: Generate unique SKU
   */
  static async _generateSKU(name) {
    const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') || 'PROD';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    
    let sku = `${prefix}-${timestamp}-${random}`;
    
    // Ensure uniqueness
    let counter = 0;
    while (await Product.findOne({ sku }) && counter < 10) {
      const newRandom = Math.random().toString(36).substring(2, 5).toUpperCase();
      sku = `${prefix}-${timestamp}-${newRandom}`;
      counter++;
    }
    
    return sku;
  }
}

