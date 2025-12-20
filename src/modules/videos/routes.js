import { Router } from 'express';
import { VideoController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import { createVideoSchema, updateVideoSchema } from './validation.js';

const router = Router();

// Public routes
router.get('/', optionalAuth, VideoController.getVideos);
router.get('/featured', VideoController.getFeaturedVideos);
router.get('/slug/:slug', optionalAuth, VideoController.getVideoBySlug);

// Public interaction routes (no auth required - uses browser fingerprinting)
router.post('/:id/view', optionalAuth, VideoController.trackView);
router.post('/:id/like', optionalAuth, VideoController.toggleLike);
router.get('/:id/like/check', optionalAuth, VideoController.checkLike);

// Stats and related content (public but can be enhanced with auth)
router.get('/:id/stats', optionalAuth, VideoController.getVideoStats);
router.get('/:id/related', optionalAuth, VideoController.getRelatedContent);

// Protected routes (require login)
router.use(authenticate);

// Bookmark routes (require auth)
router.post('/:id/bookmark', VideoController.toggleBookmark);
router.get('/:id/bookmark/check', VideoController.checkBookmark);

// Get video by ID (for admin)
router.get('/:id', authenticate, authorize(['videos.read', 'admin.all']), VideoController.getVideoById);

// Admin routes
router.post(
  '/',
  authorize(['videos.create', 'admin.all']),
  validate(createVideoSchema),
  auditLog('CREATE_VIDEO', 'videos'),
  VideoController.createVideo
);

router.put(
  '/:id',
  authorize(['videos.update', 'admin.all']),
  validate(updateVideoSchema),
  auditLog('UPDATE_VIDEO', 'videos'),
  VideoController.updateVideo
);

router.delete(
  '/:id',
  authorize(['videos.delete', 'admin.all']),
  auditLog('DELETE_VIDEO', 'videos'),
  VideoController.deleteVideo
);

export default router;

