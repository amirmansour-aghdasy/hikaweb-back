import { Router } from 'express';
import { BannerController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import { createBannerSchema, updateBannerSchema, updateOrderSchema } from './validation.js';

const router = Router();

// Public routes
router.get('/active/:position', optionalAuth, BannerController.getActiveBanners);
router.get('/service/:serviceSlug', optionalAuth, BannerController.getServiceBanner);
router.post('/:id/track-view', BannerController.trackView);
router.post('/:id/track-click', BannerController.trackClick);

// Protected routes
router.post(
  '/',
  authenticate,
  authorize(['banners.create']),
  validate(createBannerSchema),
  auditLog('CREATE_BANNER', 'banners'),
  BannerController.createBanner
);

router.get(
  '/',
  authenticate,
  authorize(['banners.read']),
  BannerController.getBanners
);

router.get(
  '/:id',
  authenticate,
  authorize(['banners.read']),
  BannerController.getBannerById
);

router.put(
  '/:id',
  authenticate,
  authorize(['banners.update']),
  validate(updateBannerSchema),
  auditLog('UPDATE_BANNER', 'banners'),
  BannerController.updateBanner
);

router.delete(
  '/:id',
  authenticate,
  authorize(['banners.delete']),
  auditLog('DELETE_BANNER', 'banners'),
  BannerController.deleteBanner
);

router.put(
  '/order',
  authenticate,
  authorize(['banners.update']),
  validate(updateOrderSchema),
  auditLog('UPDATE_BANNER_ORDER', 'banners'),
  BannerController.updateOrder
);

export default router;

