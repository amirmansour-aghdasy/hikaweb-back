import { Router } from 'express';
import { CarouselController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import { createCarouselSchema, updateCarouselSchema } from './validation.js';

const router = Router();

// Public routes
router.get('/active/:position', CarouselController.getActiveCarousels);
router.post('/:id/view', CarouselController.trackCarouselView);
router.post('/:id/click', CarouselController.trackCarouselClick);

// Protected routes
router.use(authenticate);

router.post(
  '/',
  authorize(['carousel.create']),
  validate(createCarouselSchema),
  auditLog('CREATE_CAROUSEL', 'carousel'),
  CarouselController.createCarousel
);

router.get('/', authorize(['carousel.read']), CarouselController.getCarousels);

router.get('/:id', authorize(['carousel.read']), CarouselController.getCarouselById);

router.put(
  '/:id',
  authorize(['carousel.update']),
  validate(updateCarouselSchema),
  auditLog('UPDATE_CAROUSEL', 'carousel'),
  CarouselController.updateCarousel
);

router.delete(
  '/:id',
  authorize(['carousel.delete']),
  auditLog('DELETE_CAROUSEL', 'carousel'),
  CarouselController.deleteCarousel
);

export default router;
