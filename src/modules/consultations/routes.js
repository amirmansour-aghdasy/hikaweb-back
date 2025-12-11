import { Router } from 'express';
import { ConsultationController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import { createConsultationSchema, createSimpleConsultationSchema, updateConsultationSchema } from './validation.js';

const router = Router();

// Public route for simple consultation form (homepage)
// Uses optionalAuth to link consultation to user if authenticated
router.post(
  '/simple',
  optionalAuth,
  validate(createSimpleConsultationSchema),
  auditLog('CREATE_SIMPLE_CONSULTATION', 'consultations'),
  ConsultationController.createSimpleConsultation
);

// Public route for full consultation requests
router.post(
  '/',
  validate(createConsultationSchema),
  auditLog('CREATE_CONSULTATION', 'consultations'),
  ConsultationController.createConsultation
);

// Protected routes
router.use(authenticate);

// Route for regular users to get their own consultations (no authorization required)
router.get('/my', ConsultationController.getMyConsultations);

// Route for admins to get all consultations (requires authorization)
router.get('/', authorize(['consultations.read']), ConsultationController.getConsultations);

router.get('/:id', authorize(['consultations.read']), ConsultationController.getConsultationById);

router.put(
  '/:id',
  authorize(['consultations.update']),
  validate(updateConsultationSchema),
  auditLog('UPDATE_CONSULTATION', 'consultations'),
  ConsultationController.updateConsultation
);

router.patch(
  '/:id/assign',
  authorize(['consultations.update']),
  auditLog('ASSIGN_CONSULTATION', 'consultations'),
  ConsultationController.assignConsultation
);

router.delete(
  '/:id',
  authorize(['consultations.delete']),
  auditLog('DELETE_CONSULTATION', 'consultations'),
  ConsultationController.deleteConsultation
);

export default router;
