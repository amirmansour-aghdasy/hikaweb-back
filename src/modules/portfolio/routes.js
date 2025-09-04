import { Router } from 'express';
import { PortfolioController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import { sanitizeHTML } from '../../middleware/validation.js';
import { createPortfolioSchema, updatePortfolioSchema } from './validation.js';

const router = Router();

// Public routes
router.get('/', optionalAuth, PortfolioController.getPortfolios);
router.get('/featured', PortfolioController.getFeaturedPortfolios);
router.get('/slug/:slug', optionalAuth, PortfolioController.getPortfolioBySlug);

// Protected routes
router.use(authenticate);

router.post(
  '/',
  authorize(['portfolio.create']),
  validate(createPortfolioSchema),
  sanitizeHTML(['description.fa', 'description.en', 'shortDescription.fa', 'shortDescription.en']),
  auditLog('CREATE_PORTFOLIO', 'portfolio'),
  PortfolioController.createPortfolio
);

router.get('/:id', authorize(['portfolio.read']), PortfolioController.getPortfolioById);

router.put(
  '/:id',
  authorize(['portfolio.update']),
  validate(updatePortfolioSchema),
  sanitizeHTML(['description.fa', 'description.en', 'shortDescription.fa', 'shortDescription.en']),
  auditLog('UPDATE_PORTFOLIO', 'portfolio'),
  PortfolioController.updatePortfolio
);

router.delete(
  '/:id',
  authorize(['portfolio.delete']),
  auditLog('DELETE_PORTFOLIO', 'portfolio'),
  PortfolioController.deletePortfolio
);

export default router;
