import { Router } from 'express';
import { ServiceController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import { sanitizeHTML } from '../../middleware/validation.js';
import { createServiceSchema, updateServiceSchema } from './validation.js';

const router = Router();

// Public routes
router.get('/', optionalAuth, ServiceController.getServices);
router.get('/popular', ServiceController.getPopularServices);
router.get('/slug/:slug', optionalAuth, ServiceController.getServiceBySlug);

// Protected routes
router.use(authenticate);

router.post(
  '/',
  authorize(['services.create']),
  validate(createServiceSchema),
  sanitizeHTML(['description.fa', 'description.en', 'shortDescription.fa', 'shortDescription.en']),
  auditLog('CREATE_SERVICE', 'services'),
  ServiceController.createService
);

router.get('/:id', authorize(['services.read']), ServiceController.getServiceById);

router.put(
  '/:id',
  authorize(['services.update']),
  validate(updateServiceSchema),
  sanitizeHTML(['description.fa', 'description.en', 'shortDescription.fa', 'shortDescription.en']),
  auditLog('UPDATE_SERVICE', 'services'),
  ServiceController.updateService
);

router.delete(
  '/:id',
  authorize(['services.delete']),
  auditLog('DELETE_SERVICE', 'services'),
  ServiceController.deleteService
);

export default router;
