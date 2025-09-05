import { Router } from 'express';
import { BrandController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import { sanitizeHTML } from '../../middleware/validation.js';
import { createBrandSchema, updateBrandSchema } from './validation.js';

const router = Router();

// Public routes
router.get('/featured', BrandController.getFeaturedBrands);
router.get('/industry/:industry', BrandController.getBrandsByIndustry);
router.get('/stats', BrandController.getBrandStats);
router.get('/slug/:slug', BrandController.getBrandBySlug);

// Protected routes
router.use(authenticate);

router.post(
  '/',
  authorize(['brands.create']),
  validate(createBrandSchema),
  sanitizeHTML(['description.fa', 'description.en']),
  auditLog('CREATE_BRAND', 'brand'),
  BrandController.createBrand
);

router.get('/', authorize(['brands.read']), BrandController.getBrands);

router.get('/:id', authorize(['brands.read']), BrandController.getBrandById);

router.put(
  '/:id',
  authorize(['brands.update']),
  validate(updateBrandSchema),
  sanitizeHTML(['description.fa', 'description.en']),
  auditLog('UPDATE_BRAND', 'brand'),
  BrandController.updateBrand
);

router.delete(
  '/:id',
  authorize(['brands.delete']),
  auditLog('DELETE_BRAND', 'brand'),
  BrandController.deleteBrand
);

export default router;
