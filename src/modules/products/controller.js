import { ProductService } from './service.js';
import { Product } from './model.js';
import { logger } from '../../utils/logger.js';
import { handleCreate, handleUpdate, handleDelete, handleGetList } from '../../shared/controllers/baseController.js';

/**
 * ProductController - Controller for product operations
 */
export class ProductController {
  /**
   * Create product
   * POST /api/v1/products
   */
  static async createProduct(req, res, next) {
    await handleCreate(
      req, res, next,
      ProductService.createProduct,
      'product',
      'products.createSuccess'
    );
  }

  /**
   * Get products list
   * GET /api/v1/products
   */
  static async getProducts(req, res, next) {
    await handleGetList(req, res, next, ProductService.getProducts);
  }

  /**
   * Get product by ID
   * GET /api/v1/products/:id
   */
  static async getProductById(req, res, next) {
    try {
      const { id } = req.params;
      const product = await ProductService.getProductById(id);
      
      res.status(200).json({
        success: true,
        data: { product }
      });
    } catch (error) {
      logger.error('Get product by ID error:', error);
      next(error);
    }
  }

  /**
   * Get product by slug
   * GET /api/v1/products/slug/:slug
   */
  static async getProductBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const language = req.query.lang || req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'fa';
      
      const product = await ProductService.getProductBySlug(slug, language);
      
      res.status(200).json({
        success: true,
        data: { product }
      });
    } catch (error) {
      logger.error('Get product by slug error:', error);
      next(error);
    }
  }

  /**
   * Update product
   * PUT /api/v1/products/:id
   */
  static async updateProduct(req, res, next) {
    await handleUpdate(
      req, res, next,
      ProductService.updateProduct,
      'product',
      'products.updateSuccess'
    );
  }

  /**
   * Delete product
   * DELETE /api/v1/products/:id
   */
  static async deleteProduct(req, res, next) {
    await handleDelete(
      req, res, next,
      ProductService.deleteProduct,
      'products.deleteSuccess'
    );
  }

  /**
   * Get products on sale
   * GET /api/v1/products/sale
   */
  static async getProductsOnSale(req, res, next) {
    try {
      const result = await ProductService.getProductsOnSale(req.query);
      
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Get products on sale error:', error);
      next(error);
    }
  }

  /**
   * Subscribe to product notifications
   * POST /api/v1/products/:id/notifications/subscribe
   */
  static async subscribeToNotifications(req, res, next) {
    try {
      const { id } = req.params;
      // authenticate middleware sets req.user.id (not _id)
      const userId = req.user?.id || req.user?._id;
      const { channels } = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای اشتراک در اطلاع‌رسانی‌ها باید وارد شوید'
        });
      }
      
      const product = await ProductService.subscribeToNotifications(id, userId, channels);
      
      res.status(200).json({
        success: true,
        message: 'اشتراک در اطلاع‌رسانی‌ها فعال شد',
        data: { product }
      });
    } catch (error) {
      logger.error('Subscribe to notifications error:', error);
      next(error);
    }
  }

  /**
   * Check subscription status
   * GET /api/v1/products/:id/notifications/status
   */
  static async checkSubscriptionStatus(req, res, next) {
    try {
      const { id } = req.params;
      // authenticate middleware sets req.user.id (not _id)
      const userId = req.user?.id || req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای بررسی وضعیت اشتراک باید وارد شوید'
        });
      }
      
      const status = await ProductService.checkSubscriptionStatus(id, userId);
      
      res.status(200).json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('Check subscription status error:', error);
      next(error);
    }
  }

  /**
   * Unsubscribe from product notifications
   * POST /api/v1/products/:id/notifications/unsubscribe
   */
  static async unsubscribeFromNotifications(req, res, next) {
    try {
      const { id } = req.params;
      // authenticate middleware sets req.user.id (not _id)
      const userId = req.user?.id || req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'برای لغو اشتراک باید وارد شوید'
        });
      }
      
      const product = await ProductService.unsubscribeFromNotifications(id, userId);
      
      res.status(200).json({
        success: true,
        message: 'اشتراک در اطلاع‌رسانی‌ها لغو شد',
        data: { product }
      });
    } catch (error) {
      logger.error('Unsubscribe from notifications error:', error);
      next(error);
    }
  }
}

