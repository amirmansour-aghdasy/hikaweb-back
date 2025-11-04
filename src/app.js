import cors from 'cors';
import express from 'express';
import {
    errorHandler,
    notFoundHandler,
    developmentErrorHandler,
    productionErrorHandler
  } from './middleware/errorHandler.js';  
import swaggerUi from 'swagger-ui-express';
import { logger } from './utils/logger.js';
import { Database } from './config/database.js';
import { redisClient } from './config/redis.js';
import { config } from './config/environment.js';
import { swaggerSpec } from './config/swagger.js';
import { i18nMiddleware } from './middleware/i18n.js';
import { pagination } from './middleware/pagination.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { securityMiddleware, csrfProtection } from './middleware/security.js';
import { mongoSanitization } from './middleware/validation.js';
import { authenticate } from './middleware/auth.js';

// Import all module routes
import authRoutes from './modules/auth/routes.js';
import nextAuthRoutes from './modules/auth/nextAuthRoutes.js';
import userRoutes from './modules/users/routes.js';
import articleRoutes from './modules/articles/routes.js';
import serviceRoutes from './modules/services/routes.js';
import portfolioRoutes from './modules/portfolio/routes.js';
import commentRoutes from './modules/comments/routes.js';
import teamRoutes from './modules/team/routes.js';
import faqRoutes from './modules/faq/routes.js';
import ticketRoutes from './modules/tickets/routes.js';
import categoryRoutes from './modules/categories/routes.js';
import brandRoutes from './modules/brands/routes.js';
import consultationRoutes from './modules/consultations/routes.js';
import mediaRoutes from './modules/media/routes.js';
import settingsRoutes from './modules/settings/routes.js';
import carouselRoutes from './modules/carousel/routes.js';
import analyticsRoutes from './modules/analytics/routes.js';
import notificationRoutes from './modules/notifications/routes.js';
import roleRoutes from './modules/roles/routes.js';

class App {
  constructor() {
    this.app = express();
    this.initializeDatabase();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  async initializeDatabase() {
    try {
      await Database.connect();
      
      try {
        await redisClient.connect();
      } catch (redisError) {
        logger.warn('Redis unavailable, continuing without cache');
      }
      
      logger.info('✅ Database connections established');
    } catch (error) {
      logger.error('❌ Database initialization failed:', error);
      process.exit(1);
    }
  }

  initializeMiddleware() {
    // Security middleware
    this.app.use(securityMiddleware);

    // CORS configuration
    this.app.use(
      cors({
        origin:
          config.NODE_ENV === 'production'
            ? ['https://hikaweb.ir', 'https://www.hikaweb.ir', 'https://dashboard.hikaweb.ir']
            : [
                'http://localhost:1281',
                'http://localhost:3000',
                'http://127.0.0.1:1281',
                'http://127.0.0.1:3000'
              ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'Accept-Language',
          'X-CSRF-Token',
          'X-Requested-With'
        ],
        exposedHeaders: ['X-CSRF-Token']
      })
    );

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Security sanitization
    this.app.use(mongoSanitization);

    // Rate limiting
    this.app.use(generalLimiter);

    // Internationalization
    this.app.use(i18nMiddleware);

    // CSRF protection (after auth but before routes)
    // Note: CSRF is applied conditionally in routes that need it

    // Pagination helper
    this.app.use(pagination);

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        user: req.user?.email
      });
      next();
    });

    logger.info('✅ Middleware initialized');
  }

  initializeRoutes() {
    // API Documentation
    this.app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        customSiteTitle: 'هیکاوب - مستندات API',
        customCss: `
        .swagger-ui .topbar { background-color: #1f2937; }
        .swagger-ui .topbar-wrapper img { content: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjZmZmIj48dGV4dCB4PSIxMCIgeT0iMjAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCI+SGlrYXdlYjwvdGV4dD48L3N2Zz4='); }
      `
      })
    );

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'سرور هیکاوب در حال اجرا است',
        timestamp: new Date(),
        version: '1.0.0',
        uptime: process.uptime(),
        environment: config.NODE_ENV
      });
    });

    // API routes
    const apiRouter = express.Router();

    // Authentication & Users
    apiRouter.use('/auth', authRoutes);
    // NextAuth compatible routes (for Next.js frontend)
    this.app.use('/api/auth', nextAuthRoutes);
    apiRouter.use('/users', userRoutes);
    apiRouter.use('/roles', roleRoutes);

    // Content Management
    apiRouter.use('/articles', articleRoutes);
    apiRouter.use('/services', serviceRoutes);
    apiRouter.use('/portfolio', portfolioRoutes);
    apiRouter.use('/comments', commentRoutes);
    apiRouter.use('/team', teamRoutes);
    apiRouter.use('/faq', faqRoutes);

    // System & Support
    apiRouter.use('/tickets', ticketRoutes);
    apiRouter.use('/categories', categoryRoutes);
    apiRouter.use('/brands', brandRoutes);
    apiRouter.use('/consultations', consultationRoutes);

    // Media & Settings
    apiRouter.use('/media', mediaRoutes);
    apiRouter.use('/settings', settingsRoutes);
    apiRouter.use('/carousel', carouselRoutes);

    // Analytics & Notifications
    apiRouter.use('/analytics', analyticsRoutes);
    apiRouter.use('/notifications', notificationRoutes);

    // Mount API routes
    this.app.use('/api/v1', apiRouter);

    // API root endpoint
    this.app.get('/api', (req, res) => {
      res.json({
        success: true,
        message: 'Hikaweb Digital Marketing Agency API',
        version: '1.0.0',
        documentation: '/api-docs',
        endpoints: {
          auth: '/api/v1/auth',
          users: '/api/v1/users',
          articles: '/api/v1/articles',
          services: '/api/v1/services',
          portfolio: '/api/v1/portfolio',
          comments: '/api/v1/comments',
          team: '/api/v1/team',
          faq: '/api/v1/faq',
          tickets: '/api/v1/tickets',
          categories: '/api/v1/categories',
          brands: '/api/v1/brands',
          consultations: '/api/v1/consultations',
          media: '/api/v1/media',
          settings: '/api/v1/settings',
          carousel: '/api/v1/carousel'
        },
        contact: {
          website: 'https://hikaweb.ir',
          email: 'info@hikaweb.ir',
          support: 'support@hikaweb.ir'
        }
      });
    });

    logger.info('✅ Routes initialized');
  }

  initializeErrorHandling() {
    if (process.env.NODE_ENV === 'development') {
      this.app.use(developmentErrorHandler);
    }

    // Production middleware
    if (process.env.NODE_ENV === 'production') {
      this.app.use(productionErrorHandler);
    }

    // Main handlers
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);

    logger.info('✅ Error handling initialized');
  }

  getExpressApp() {
    return this.app;
  }

  async start() {
    const port = config.PORT || 3000;

    this.app.listen(port, () => {
      logger.info(`🚀 Hikaweb API Server running on port ${port}`);
      logger.info(`📚 API Documentation: http://localhost:${port}/api-docs`);
      logger.info(`🏥 Health Check: http://localhost:${port}/health`);
      logger.info(`🌐 Environment: ${config.NODE_ENV}`);
    });
  }

  async gracefulShutdown() {
    logger.info('🔄 Graceful shutdown initiated...');

    try {
      await Database.disconnect();
      await redisClient.disconnect();
      logger.info('✅ Database connections closed');

      process.exit(0);
    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received');
  await app.gracefulShutdown();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received');
  await app.gracefulShutdown();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default App;
