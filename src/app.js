import express from 'express';
import cors from 'cors';
import { config } from './config/environment.js';
import { Database } from './config/database.js';
import { redisClient } from './config/redis.js';
import { logger } from './utils/logger.js';
import { i18nMiddleware } from './middleware/i18n.js';
import { securityMiddleware, mongoSanitization } from './middleware/security.js';
import { generalLimiter } from './middleware/rateLimiting.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { pagination } from './middleware/pagination.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

// Import all module routes
import authRoutes from './modules/auth/routes.js';
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
      await redisClient.connect();
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
            ? ['https://hikaweb.ir', 'https://www.hikaweb.ir', 'https://admin.hikaweb.ir']
            : true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language']
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
    apiRouter.use('/users', userRoutes);

    // Content Management
    apiRouter.use('/articles', articleRoutes);
    apiRouter.use('/services', serviceRoutes);
    apiRouter.use('/portfolio', portfolioRoutes);
    apiRouter.use('/comments', commentRoutes);
    apiRouter.use('/team', teamRoutes);
    apiRouter.use('/faq', faqRoutes);

    // System
    apiRouter.use('/tickets', ticketRoutes);
    apiRouter.use('/categories', categoryRoutes);
    apiRouter.use('/brands', brandRoutes);
    apiRouter.use('/consultations', consultationRoutes);
    apiRouter.use('/media', mediaRoutes);
    apiRouter.use('/settings', settingsRoutes);
    apiRouter.use('/carousel', carouselRoutes);

    this.app.use(`/api/${config.API_VERSION}`, apiRouter);

    // Serve uploaded files (for development)
    if (config.NODE_ENV === 'development') {
      this.app.use('/uploads', express.static('uploads'));
    }

    // Root redirect
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'به API هیکاوب خوش آمدید',
        version: '1.0.0',
        documentation: '/api-docs',
        endpoints: {
          health: '/health',
          api: `/api/${config.API_VERSION}`
        }
      });
    });

    logger.info('✅ Routes initialized');
  }

  initializeErrorHandling() {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);

    logger.info('✅ Error handling initialized');
  }

  getApp() {
    return this.app;
  }
}

export default App;
