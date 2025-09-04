import { Router } from 'express';
import { ConsultationController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import { createConsultationSchema, updateConsultationSchema } from './validation.js';

const router = Router();

// Public route for consultation requests
router.post(
  '/',
  validate(createConsultationSchema),
  auditLog('CREATE_CONSULTATION', 'consultations'),
  ConsultationController.createConsultation
);

// Protected routes
router.use(authenticate);

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

export default router;
