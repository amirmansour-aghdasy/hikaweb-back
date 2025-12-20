import { Router } from 'express';
import { ShortLinkController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import { createShortLinkSchema, updateShortLinkSchema } from './validation.js';

const router = Router();

// Public routes
// IMPORTANT: More specific routes must come before less specific ones
router.get('/:code/info', ShortLinkController.getShortLinkByCode); // Get info as JSON (must be before redirect route)
router.get('/resource/:resourceType/:resourceId', ShortLinkController.getShortLinkByResource);
router.get('/:code', ShortLinkController.redirectShortLink); // Redirect route (must be last)

// Protected routes - Create short link (public can create)
router.post(
  '/',
  optionalAuth,
  validate(createShortLinkSchema),
  ShortLinkController.createShortLink
);

router.post(
  '/get-or-create',
  optionalAuth,
  validate(createShortLinkSchema),
  ShortLinkController.getOrCreateShortLink
);

// Admin routes
router.get(
  '/',
  authenticate,
  authorize(['shortlinks.read', 'admin']),
  ShortLinkController.getShortLinks
);

router.patch(
  '/:id',
  authenticate,
  authorize(['shortlinks.update', 'admin']),
  validate(updateShortLinkSchema),
  auditLog('UPDATE_SHORT_LINK', 'shortlinks'),
  ShortLinkController.updateShortLink
);

router.delete(
  '/:id',
  authenticate,
  authorize(['shortlinks.delete', 'admin']),
  auditLog('DELETE_SHORT_LINK', 'shortlinks'),
  ShortLinkController.deleteShortLink
);

export default router;

