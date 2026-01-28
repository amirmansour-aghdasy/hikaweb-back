import { Order } from './model.js';
import { Cart } from '../cart/model.js';
import { Product } from '../products/model.js';
import { CouponService } from '../coupons/service.js';
import { BaseService } from '../../shared/services/baseService.js';
import { logger } from '../../utils/logger.js';

/**
 * OrderService - Service layer for order operations
 * 
 * Features:
 * - Create orders from cart
 * - Get user orders
 * - Update order status
 * - Cancel orders
 * - Download digital products
 */
export class OrderService extends BaseService {
  constructor() {
    super(Order);
  }

  /**
   * Create order from cart
   * @param {string} userId - User ID
   * @param {Object} orderData - Order data (contact info, shipping, payment)
   * @returns {Promise<Order>} Created order
   */
  static async createOrderFromCart(userId, orderData) {
    try {
      // Get user cart
      const cart = await Cart.findOne({
        user: userId,
        status: 'active',
        expiresAt: { $gt: new Date() }
      }).populate('items.product');

      if (!cart || cart.items.length === 0) {
        throw new Error('سبد خرید خالی است یا منقضی شده است');
      }

      // Validate cart items and inventory
      const validatedItems = [];
      for (const cartItem of cart.items) {
        const product = cartItem.product;
        
        if (!product) {
          throw new Error(`محصول با شناسه ${cartItem.product} یافت نشد`);
        }

        // Check if product is still available
        if (product.deletedAt || product.status !== 'active' || !product.isPublished) {
          throw new Error(`محصول ${product.name?.fa || product.name} در دسترس نیست`);
        }

        // Check inventory for physical products
        if (product.type === 'physical' && product.inventory.trackInventory) {
          if (cartItem.quantity > product.inventory.quantity && !product.inventory.allowBackorder) {
            throw new Error(`موجودی محصول ${product.name?.fa || product.name} کافی نیست. موجودی: ${product.inventory.quantity}`);
          }
        }

        // Get current price
        const currentPrice = product.pricing.isOnSale && product.pricing.salePrice
          ? product.pricing.salePrice
          : product.pricing.basePrice;

        validatedItems.push({
          product: product._id,
          quantity: cartItem.quantity,
          price: currentPrice,
          salePrice: product.pricing.isOnSale && product.pricing.salePrice ? product.pricing.salePrice : null,
          total: cartItem.quantity * currentPrice,
          digitalProductData: product.type === 'digital' ? {
            downloadUrl: product.digitalProduct?.downloadUrl,
            downloadLimit: product.digitalProduct?.downloadLimit,
            downloadExpiry: product.digitalProduct?.downloadExpiry
              ? new Date(Date.now() + product.digitalProduct.downloadExpiry * 24 * 60 * 60 * 1000)
              : null,
            downloadCount: 0
          } : undefined
        });
      }

      // Validate and apply coupon if exists
      let couponData = null;
      if (cart.coupon?.code) {
        try {
          const itemsForValidation = validatedItems.map(item => ({
            product: item.product,
            quantity: item.quantity
          }));
          
          const validation = await CouponService.validateCoupon(
            cart.coupon.code,
            userId,
            cart.totals.subtotal,
            itemsForValidation
          );
          
          if (validation.valid) {
            couponData = {
              code: validation.coupon.code,
              discount: validation.coupon.discount,
              discountType: validation.coupon.discountType
            };
          }
        } catch (error) {
          logger.warn(`Coupon validation failed for order: ${error.message}`);
          // Continue without coupon if validation fails
        }
      }

      // Create order
      const order = new Order({
        user: userId,
        items: validatedItems,
        contactInfo: orderData.contactInfo,
        shipping: orderData.shipping || {},
        payment: {
          method: orderData.paymentMethod,
          status: 'pending', // All orders start with pending payment status
          amount: cart.totals.total
        },
        totals: cart.totals,
        coupon: couponData,
        cart: cart._id,
        status: 'pending'
      });

      // Calculate totals
      order.calculateTotals();

      // Update payment amount to match calculated total
      order.payment.amount = order.totals.total;

      // Save order
      await order.save();
      
      // Update inventory for physical products using atomic operations
      // This prevents race conditions when multiple orders are created simultaneously
      for (const item of validatedItems) {
        const product = await Product.findById(item.product);
        if (product && product.type === 'physical' && product.inventory.trackInventory) {
          // Use atomic operation to decrement inventory and check availability
          const updatedProduct = await Product.findOneAndUpdate(
            {
              _id: item.product,
              'inventory.quantity': { $gte: item.quantity } // Only update if enough inventory
            },
            {
              $inc: {
                'inventory.quantity': -item.quantity,
                'sales': item.quantity
              }
            },
            { new: true }
          );

          if (!updatedProduct) {
            // Inventory was insufficient (race condition detected)
            throw new Error(`موجودی محصول ${product.name?.fa || product.name} کافی نیست. لطفا سبد خرید را بررسی کنید.`);
          }

          // Update stock status based on new quantity
          if (updatedProduct.inventory.quantity <= 0) {
            updatedProduct.inventory.stockStatus = 'out_of_stock';
          } else if (updatedProduct.inventory.quantity <= updatedProduct.inventory.lowStockThreshold) {
            updatedProduct.inventory.stockStatus = 'low_stock';
          } else {
            updatedProduct.inventory.stockStatus = 'in_stock';
          }
          
          await updatedProduct.save();
        } else if (product && product.type === 'physical' && !product.inventory.trackInventory) {
          // For products that don't track inventory, just update sales count
          await Product.findByIdAndUpdate(item.product, {
            $inc: { sales: item.quantity }
          });
        }
      }

      // Record coupon usage if coupon was applied (using atomic operation)
      if (couponData && couponData.code) {
        try {
          const { Coupon } = await import('../coupons/model.js');
          
          // Get the coupon to check current usage and limits
          const couponDoc = await Coupon.findActiveByCode(couponData.code);
          
          if (couponDoc) {
            const currentUsage = couponDoc.usage.count || 0;
            const maxUsage = couponDoc.limits.maxUsage;
            
            // Check if usage limit would be exceeded
            if (maxUsage && currentUsage >= maxUsage) {
              logger.warn(`Coupon ${couponData.code} usage limit already exceeded (current: ${currentUsage}, max: ${maxUsage})`);
              // Don't throw error - order is already created, just log the issue
            } else {
              // Use atomic operation to increment usage count and add history entry
              // This prevents race conditions when multiple users apply the same coupon simultaneously
              // We use the current usage count in the query condition to ensure atomicity
              const updatedCoupon = await Coupon.findOneAndUpdate(
                {
                  _id: couponDoc._id,
                  // Only update if usage count hasn't changed (optimistic locking)
                  // and if usage limit hasn't been reached
                  $expr: {
                    $and: [
                      { $eq: ['$usage.count', currentUsage] },
                      {
                        $or: [
                          { $eq: ['$limits.maxUsage', null] },
                          { $lt: ['$usage.count', '$limits.maxUsage'] }
                        ]
                      }
                    ]
                  }
                },
                {
                  $inc: {
                    'usage.count': 1,
                    'usage.totalDiscount': couponData.discount
                  },
                  $push: {
                    'usage.history': {
                      user: userId,
                      order: order._id,
                      usedAt: new Date(),
                      discountAmount: couponData.discount
                    }
                  }
                },
                { new: true }
              );

              if (!updatedCoupon) {
                // Coupon usage limit exceeded during update (race condition detected)
                logger.warn(`Coupon ${couponData.code} usage limit exceeded during order creation (race condition detected)`);
                // Don't throw error - order is already created, just log the issue
              }
            }
          }
        } catch (error) {
          logger.warn(`Failed to record coupon usage: ${error.message}`);
          // Don't throw error - order is already created, just log the issue
        }
      }

      // Mark cart as converted (archived)
      cart.markAsConverted();
      await cart.save();

      // Populate order for response
      await order.populate({
        path: 'items.product',
        select: 'name slug featuredImage pricing type'
      });

      logger.info(`Order created: ${order.orderNumber}, user: ${userId}`);
      return order;
    } catch (error) {
      logger.error('Create order error:', error);
      throw error;
    }
  }

  /**
   * Get user orders
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Orders and pagination
   */
  static async getUserOrders(userId, options = {}) {
    try {
      const page = parseInt(options.page) || 1;
      const limit = parseInt(options.limit) || 10;
      const skip = (page - 1) * limit;
      const status = options.status;

      const query = { user: userId, deletedAt: null };
      if (status && status !== 'all') {
        query.status = status;
      }

      const [orders, total] = await Promise.all([
        Order.find(query)
          .populate('items.product', 'name slug featuredImage pricing type')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Order.countDocuments(query)
      ]);

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Get user orders error:', error);
      throw error;
    }
  }

  /**
   * Get order by ID (with ownership check)
   * @param {string} orderId - Order ID
   * @param {string} userId - User ID (optional, for ownership check)
   * @returns {Promise<Order>} Order document
   */
  static async getOrderById(orderId, userId = null) {
    try {
      const query = { _id: orderId, deletedAt: null };
      
      // If userId provided, check ownership
      if (userId) {
        query.user = userId;
      }

      const order = await Order.findOne(query)
        .populate('items.product')
        .populate('user', 'name email phoneNumber');

      if (!order) {
        throw new Error('سفارش یافت نشد');
      }

      return order;
    } catch (error) {
      logger.error('Get order by ID error:', error);
      throw error;
    }
  }

  /**
   * Update order status
   * @param {string} orderId - Order ID
   * @param {string} newStatus - New status
   * @param {string} userId - User ID (admin)
   * @param {string} note - Optional note
   * @returns {Promise<Order>} Updated order
   */
  static async updateOrderStatus(orderId, newStatus, userId, note = null) {
    try {
      const order = await Order.findById(orderId).populate('user', 'name email phoneNumber');

      if (!order) {
        throw new Error('سفارش یافت نشد');
      }

      const oldStatus = order.status;
      await order.updateStatus(newStatus, userId, note);

      // Send notification to user
      if (order.user && oldStatus !== newStatus) {
        try {
          const { Notification } = await import('../notifications/model.js');
          
          const statusLabels = {
            pending: { fa: 'در انتظار پرداخت', en: 'Pending Payment' },
            processing: { fa: 'در حال پردازش', en: 'Processing' },
            shipped: { fa: 'ارسال شده', en: 'Shipped' },
            delivered: { fa: 'تحویل داده شده', en: 'Delivered' },
            cancelled: { fa: 'لغو شده', en: 'Cancelled' },
            refunded: { fa: 'بازگشت وجه', en: 'Refunded' }
          };

          const statusLabel = statusLabels[newStatus] || { fa: newStatus, en: newStatus };

          await Notification.create({
            type: 'order_status_changed',
            title: {
              fa: 'وضعیت سفارش تغییر کرد',
              en: 'Order Status Changed'
            },
            message: {
              fa: `وضعیت سفارش ${order.orderNumber} به "${statusLabel.fa}" تغییر کرد${note ? `: ${note}` : ''}`,
              en: `Order ${order.orderNumber} status changed to "${statusLabel.en}"${note ? `: ${note}` : ''}`
            },
            recipient: order.user._id,
            relatedEntity: {
              type: 'order',
              id: order._id
            },
            priority: newStatus === 'cancelled' || newStatus === 'refunded' ? 'high' : 'normal',
            actionUrl: `/orders/${order._id}`
          });

          logger.info(`Notification sent for order status change: ${order.orderNumber}`);
        } catch (notificationError) {
          logger.error('Failed to send order status notification:', notificationError);
          // Don't throw - notification failure shouldn't break order update
        }
      }

      logger.info(`Order status updated: ${order.orderNumber}, status: ${newStatus}`);
      return order;
    } catch (error) {
      logger.error('Update order status error:', error);
      throw error;
    }
  }

  /**
   * Cancel order
   * @param {string} orderId - Order ID
   * @param {string} userId - User ID (buyer or admin)
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Order>} Cancelled order
   */
  static async cancelOrder(orderId, userId, reason = null) {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        throw new Error('سفارش یافت نشد');
      }

      // Check ownership (user can only cancel their own orders)
      if (order.user.toString() !== userId.toString()) {
        // Check if user is admin (this should be checked in controller)
        throw new Error('شما اجازه لغو این سفارش را ندارید');
      }

      // Only allow canceling pending orders
      if (order.status !== 'pending') {
        throw new Error('فقط سفارشات در انتظار پرداخت قابل لغو هستند');
      }

      // Store old status before cancellation
      const oldStatus = order.status;

      await order.cancel(userId, reason);

      // Restore inventory if order was processing or shipped (before cancellation)
      if (oldStatus === 'processing' || oldStatus === 'shipped') {
        for (const item of order.items) {
          const product = await Product.findById(item.product);
          if (product && product.type === 'physical' && product.inventory.trackInventory) {
            // Use atomic operation to restore inventory
            const updatedProduct = await Product.findByIdAndUpdate(
              item.product,
              {
                $inc: {
                  'inventory.quantity': item.quantity
                }
              },
              { new: true }
            );

            if (updatedProduct) {
              // Update stock status based on new quantity
              if (updatedProduct.inventory.quantity > updatedProduct.inventory.lowStockThreshold) {
                updatedProduct.inventory.stockStatus = 'in_stock';
              } else if (updatedProduct.inventory.quantity > 0) {
                updatedProduct.inventory.stockStatus = 'low_stock';
              } else {
                updatedProduct.inventory.stockStatus = 'out_of_stock';
              }
              
              await updatedProduct.save();
            }
          }
        }
      }

      logger.info(`Order cancelled: ${order.orderNumber}, user: ${userId}`);
      return order;
    } catch (error) {
      logger.error('Cancel order error:', error);
      throw error;
    }
  }

  /**
   * Mark order as paid
   * @param {string} orderId - Order ID
   * @param {string} transactionId - Payment transaction ID
   * @param {string} gateway - Payment gateway name
   * @param {Object} gatewayResponse - Gateway response data
   * @returns {Promise<Order>} Updated order
   */
  static async markOrderAsPaid(orderId, transactionId, gateway, gatewayResponse = null) {
    try {
      const order = await Order.findById(orderId)
        .populate('items.product', 'type');

      if (!order) {
        throw new Error('سفارش یافت نشد');
      }

      await order.markAsPaid(transactionId, gateway, gatewayResponse);

      logger.info(`Order marked as paid: ${order.orderNumber}, transaction: ${transactionId}, status: ${order.status}`);
      return order;
    } catch (error) {
      logger.error('Mark order as paid error:', error);
      throw error;
    }
  }

  /**
   * Get orders with filters (for admin)
   * @param {Object} filters - Filter options
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Orders and pagination
   */
  static async getOrders(filters = {}, options = {}) {
    try {
      const page = parseInt(options.page) || 1;
      const limit = parseInt(options.limit) || 25;
      const skip = (page - 1) * limit;

      const query = { deletedAt: null };

      // Apply filters
      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.userId) {
        query.user = filters.userId;
      }

      if (filters.orderNumber) {
        query.orderNumber = { $regex: filters.orderNumber, $options: 'i' };
      }

      if (filters.paymentStatus) {
        query['payment.status'] = filters.paymentStatus;
      }

      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) {
          query.createdAt.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          query.createdAt.$lte = new Date(filters.dateTo);
        }
      }

      const [orders, total] = await Promise.all([
        Order.find(query)
          .populate('user', 'name email phoneNumber')
          .populate('items.product', 'name slug featuredImage')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Order.countDocuments(query)
      ]);

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Get orders error:', error);
      throw error;
    }
  }

  /**
   * Download digital product from order
   * @param {string} orderId - Order ID
   * @param {string} itemId - Order item ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Download URL and metadata
   */
  static async downloadDigitalProduct(orderId, itemId, userId) {
    try {
      const order = await Order.findOne({
        _id: orderId,
        user: userId,
        deletedAt: null
      });

      if (!order) {
        throw new Error('سفارش یافت نشد');
      }

      // Find the item in order
      const item = order.items.id(itemId);
      if (!item) {
        throw new Error('آیتم سفارش یافت نشد');
      }

      // Check if item is digital product
      if (!item.digitalProductData || !item.digitalProductData.downloadUrl) {
        throw new Error('این محصول دیجیتال نیست');
      }

      // Check if order is paid
      if (order.payment.status !== 'completed') {
        throw new Error('سفارش پرداخت نشده است');
      }

      // Check download limit
      if (item.digitalProductData.downloadLimit !== null) {
        if ((item.digitalProductData.downloadCount || 0) >= item.digitalProductData.downloadLimit) {
          throw new Error('تعداد دانلود مجاز به پایان رسیده است');
        }
      }

      // Check download expiry
      if (item.digitalProductData.downloadExpiry) {
        if (new Date() > new Date(item.digitalProductData.downloadExpiry)) {
          throw new Error('مدت زمان دانلود به پایان رسیده است');
        }
      }

      // Increment download count
      item.digitalProductData.downloadCount = (item.digitalProductData.downloadCount || 0) + 1;
      await order.save();

      logger.info(`Digital product downloaded: order ${order.orderNumber}, item ${itemId}, user ${userId}`);

      return {
        downloadUrl: item.digitalProductData.downloadUrl,
        downloadCount: item.digitalProductData.downloadCount,
        downloadLimit: item.digitalProductData.downloadLimit,
        downloadExpiry: item.digitalProductData.downloadExpiry
      };
    } catch (error) {
      logger.error('Download digital product error:', error);
      throw error;
    }
  }

  /**
   * Generate invoice PDF for order
   * @param {string} orderId - Order ID
   * @param {string} userId - User ID (for ownership check)
   * @returns {Promise<Buffer>} PDF buffer
   */
  static async generateInvoice(orderId, userId) {
    try {
      const order = await Order.findById(orderId)
        .populate('items.product', 'name slug sku')
        .populate('user', 'name email phone');

      if (!order) {
        throw new Error('سفارش یافت نشد');
      }

      // Check ownership
      if (order.user._id.toString() !== userId.toString()) {
        throw new Error('شما اجازه دسترسی به این فاکتور را ندارید');
      }

      const PDFDocument = (await import('pdfkit')).default;
      const path = (await import('path')).default;
      const fs = (await import('fs')).default;
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        autoFirstPage: true
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));

      // Register Persian font for proper RTL text rendering
      // Using fonts from front/public/fonts (copied to back/fonts)
      let persianFont = 'Helvetica'; // Default fallback
      let persianFontBold = 'Helvetica-Bold'; // Default fallback for bold
      
      try {
        const fontsDir = path.join(process.cwd(), 'fonts');
        
        // Try to register Persian fonts (woff/woff2 need to be converted or use fontkit)
        // pdfkit only supports TTF/OTF, so we'll try to find TTF first, then try woff conversion
        const possibleFonts = [
          { name: 'IRANSans-Regular.ttf', bold: 'IRANSans-Bold.ttf' },
          { name: 'IRANSansXFaNum-Regular.ttf', bold: 'IRANSansXFaNum-Bold.ttf' },
          { name: 'Vazir.ttf', bold: 'Vazir-Bold.ttf' },
          { name: 'Tahoma.ttf', bold: 'Tahoma-Bold.ttf' }
        ];
        
        let fontRegistered = false;
        
        // First, try TTF fonts
        for (const fontSet of possibleFonts) {
          const regularPath = path.join(fontsDir, fontSet.name);
          const boldPath = path.join(fontsDir, fontSet.bold);
          
          if (fs.existsSync(regularPath)) {
            doc.registerFont('Persian', regularPath);
            persianFont = 'Persian';
            fontRegistered = true;
            
            if (fs.existsSync(boldPath)) {
              doc.registerFont('Persian-Bold', boldPath);
              persianFontBold = 'Persian-Bold';
            }
            
            logger.info(`Persian font registered: ${fontSet.name}`);
            break;
          }
        }
        
        // If no TTF found, try to use woff fonts with opentype.js
        // opentype.js supports woff but not woff2
        // For woff2, we'll need to convert them to woff or TTF first
        if (!fontRegistered) {
          try {
            const opentype = (await import('opentype.js')).default;
            const woffRegularPath = path.join(fontsDir, 'IRANSansXFaNum-Regular.woff');
            const woffBoldPath = path.join(fontsDir, 'IRANSansXFaNum-Bold.woff');
            
            // opentype.js only supports woff, not woff2
            // So we'll use woff files if available
            let regularFontPath = null;
            let boldFontPath = null;
            
            if (fs.existsSync(woffRegularPath)) {
              regularFontPath = woffRegularPath;
            }
            
            if (fs.existsSync(woffBoldPath)) {
              boldFontPath = woffBoldPath;
            }
            
            if (regularFontPath) {
              // opentype.js can read woff files and convert them to TTF
              const fontBuffer = fs.readFileSync(regularFontPath);
              const font = opentype.parse(fontBuffer.buffer);
              
              // opentype.js can convert font to TTF ArrayBuffer
              // Use toArrayBuffer (toBuffer is deprecated)
              const ttfArrayBuffer = font.toArrayBuffer();
              // Convert ArrayBuffer to Node.js Buffer
              const ttfBuffer = Buffer.from(ttfArrayBuffer);
              
              // Register the TTF buffer with pdfkit
              doc.registerFont('Persian', ttfBuffer);
              persianFont = 'Persian';
              fontRegistered = true;
              
              // Handle bold font
              if (boldFontPath) {
                const boldFontBuffer = fs.readFileSync(boldFontPath);
                const boldFont = opentype.parse(boldFontBuffer.buffer);
                const boldTtfArrayBuffer = boldFont.toArrayBuffer();
                const boldTtfBuffer = Buffer.from(boldTtfArrayBuffer);
                doc.registerFont('Persian-Bold', boldTtfBuffer);
                persianFontBold = 'Persian-Bold';
              }
              
              logger.info(`Persian font registered from ${path.basename(regularFontPath)} using opentype.js`);
            }
          } catch (woffError) {
            logger.warn('Could not load woff font with opentype.js:', woffError);
            // Fallback: log that TTF conversion is needed
            logger.warn('Please ensure woff fonts are available or convert woff2 to woff/TTF format');
          }
        }
        
        // If still no font found, log a warning
        if (!fontRegistered) {
          logger.warn('No Persian font found. PDF may display Persian text incorrectly. ' +
                     'Please ensure fonts are in back/fonts/ directory.');
        }
      } catch (fontError) {
        logger.warn('Could not register Persian font, using fallback:', fontError);
      }

      // Helper function to reshape and apply bidi for Persian text
      // This ensures proper RTL text rendering in PDF
      // Note: Using require (via createRequire) since pdfkit text() is synchronous
      const preparePersianText = (text) => {
        if (!text || typeof text !== 'string') return text || '';
        
        try {
          // Use require (created via createRequire above) for ES modules compatibility
          const arabicReshaper = require('arabic-reshaper');
          
          // Reshape Arabic/Persian characters for proper display
          // convertArabic converts isolated characters to their contextual forms
          // This is essential for proper Persian text rendering in PDF
          const reshaped = arabicReshaper.convertArabic(text);
          
          // Note: pdfkit handles RTL direction through align: 'right'
          // The reshaped text will display correctly with Persian font
          // Bidi algorithm is not strictly necessary as pdfkit's align handles direction
          return reshaped;
        } catch (error) {
          // If reshape fails, return original text
          // This ensures the PDF generation doesn't fail if libraries are unavailable
          if (process.env.NODE_ENV === 'development') {
            logger.warn('Error reshaping Persian text:', error);
          }
          return text;
        }
      };

      // Helper function to format price
      const formatPrice = (price) => {
        return new Intl.NumberFormat('fa-IR').format(price || 0);
      };

      // Helper function to format date
      const formatDate = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        return new Intl.DateTimeFormat('fa-IR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          calendar: 'persian'
        }).format(d);
      };

      // Header - Use font that supports Persian with RTL
      doc.fontSize(24)
         .font(persianFont)
         .text(preparePersianText('فاکتور فروش'), { align: 'right' })
         .moveDown();

      // Order Info
      doc.fontSize(12)
         .font(persianFont)
         .text(preparePersianText(`شماره سفارش: ${order.orderNumber}`), { align: 'right' })
         .text(preparePersianText(`تاریخ ثبت: ${formatDate(order.createdAt)}`), { align: 'right' })
         .moveDown();

      // Customer Info
      doc.fontSize(14)
         .font(persianFont)
         .text(preparePersianText('اطلاعات مشتری:'), { align: 'right' })
         .fontSize(12)
         .text(preparePersianText(`نام: ${order.contactInfo?.fullName || order.user?.name || '-'}`), { align: 'right' })
         .text(preparePersianText(`ایمیل: ${order.contactInfo?.email || order.user?.email || '-'}`), { align: 'right' });
      
      if (order.contactInfo?.phoneNumber || order.user?.phone) {
        doc.font(persianFont)
           .text(preparePersianText(`تلفن: ${order.contactInfo?.phoneNumber || order.user?.phone || '-'}`), { align: 'right' });
      }
      
      doc.moveDown();

      // Items Table Header
      doc.fontSize(14)
         .font(persianFont)
         .text(preparePersianText('محصولات:'), { align: 'right' })
         .moveDown(0.5);

      // Table headers
      const tableTop = doc.y;
      doc.fontSize(10)
         .font(persianFont)
         .text(preparePersianText('جمع'), 450, tableTop, { width: 80, align: 'right' })
         .text(preparePersianText('قیمت واحد'), 350, tableTop, { width: 80, align: 'right' })
         .text(preparePersianText('تعداد'), 280, tableTop, { width: 60, align: 'right' })
         .text(preparePersianText('نام محصول'), 50, tableTop, { width: 220, align: 'right' });

      // Draw line under header
      doc.moveTo(50, doc.y + 5)
         .lineTo(530, doc.y + 5)
         .stroke()
         .moveDown();

      // Items
      let y = doc.y;
      order.items.forEach((item, index) => {
        const productName = item.product?.name?.fa || item.product?.name || 'محصول';
        const quantity = item.quantity || 1;
        const price = item.price || 0;
        const total = item.total || 0;

        doc.fontSize(10)
           .font(persianFont)
           .text(formatPrice(total), 450, y, { width: 80, align: 'right' })
           .text(formatPrice(price), 350, y, { width: 80, align: 'right' })
           .text(quantity.toString(), 280, y, { width: 60, align: 'right' })
           .text(preparePersianText(productName), 50, y, { width: 220, align: 'right' });

        y += 25;
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
      });

      doc.y = y + 10;

      // Draw line before totals
      doc.moveTo(50, doc.y)
         .lineTo(530, doc.y)
         .stroke()
         .moveDown();

      // Totals
      doc.fontSize(12)
         .font(persianFont);
      if (order.totals?.subtotal) {
        doc.text(preparePersianText(`جمع جزء: ${formatPrice(order.totals.subtotal)} تومان`), { align: 'right' });
      }
      if (order.totals?.discount > 0) {
        doc.text(preparePersianText(`تخفیف: ${formatPrice(order.totals.discount)} تومان`), { align: 'right' });
      }
      if (order.totals?.shipping > 0) {
        doc.text(preparePersianText(`هزینه ارسال: ${formatPrice(order.totals.shipping)} تومان`), { align: 'right' });
      }
      if (order.totals?.tax > 0) {
        doc.text(preparePersianText(`مالیات: ${formatPrice(order.totals.tax)} تومان`), { align: 'right' });
      }
      
      doc.moveDown(0.5);
      doc.fontSize(14)
         .font(persianFontBold)
         .text(preparePersianText(`مجموع کل: ${formatPrice(order.totals?.total || 0)} تومان`), { align: 'right' })
         .font(persianFont);

      // Payment Info
      doc.moveDown();
      doc.fontSize(12)
         .font(persianFont)
         .text(preparePersianText('اطلاعات پرداخت:'), { align: 'right' })
         .fontSize(10)
         .text(preparePersianText(`روش پرداخت: ${order.payment?.method === 'online' ? 'پرداخت آنلاین' : 'پرداخت با امتیاز'}`), { align: 'right' })
         .text(preparePersianText(`وضعیت: ${order.payment?.status === 'completed' ? 'پرداخت شده' : 'در انتظار پرداخت'}`), { align: 'right' });
      
      if (order.payment?.transactionId) {
        doc.font(persianFont)
           .text(preparePersianText(`کد تراکنش: ${order.payment.transactionId}`), { align: 'right' });
      }
      if (order.payment?.paidAt) {
        doc.font(persianFont)
           .text(preparePersianText(`تاریخ پرداخت: ${formatDate(order.payment.paidAt)}`), { align: 'right' });
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(8)
         .font(persianFont)
         .text(preparePersianText('این فاکتور به صورت خودکار تولید شده است.'), { align: 'center' })
         .text(preparePersianText('هیکاوب - hikaweb.ir'), { align: 'center' });

      doc.end();

      // Wait for PDF to be generated
      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          logger.info(`Invoice generated for order: ${order.orderNumber}`);
          resolve(pdfBuffer);
        });

        doc.on('error', (error) => {
          logger.error('PDF generation error:', error);
          reject(error);
        });
      });
    } catch (error) {
      logger.error('Generate invoice error:', error);
      throw error;
    }
  }

  /**
   * Get purchased product IDs for a user (for digital article products)
   * @param {string} userId - User ID
   * @returns {Promise<Array<string>>} Array of purchased product IDs
   */
  static async getPurchasedProductIds(userId) {
    try {
      if (!userId) {
        return [];
      }

      // Find all completed/delivered orders with digital products
      const orders = await Order.find({
        user: userId,
        'payment.status': 'completed',
        status: { $in: ['delivered', 'processing', 'shipped'] },
        deletedAt: null
      })
        .populate('items.product', 'type digitalProduct')
        .select('items.product')
        .lean();

      // Extract unique product IDs that are digital article products
      const purchasedProductIds = new Set();
      
      orders.forEach(order => {
        order.items.forEach(item => {
          const product = item.product;
          if (product && 
              product.type === 'digital' && 
              product.digitalProduct?.contentType === 'article') {
            purchasedProductIds.add(product._id.toString());
          }
        });
      });

      return Array.from(purchasedProductIds);
    } catch (error) {
      logger.error('Get purchased product IDs error:', error);
      return [];
    }
  }
}
