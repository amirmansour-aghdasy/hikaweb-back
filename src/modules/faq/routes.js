import { Router } from 'express';
import { FAQController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import { sanitizeHTML } from '../../middleware/validation.js';
import { createFAQSchema, updateFAQSchema } from './validation.js';

const router = Router();

// Public routes
router.get('/public', FAQController.getPublicFAQs);
router.get('/service/:serviceId', FAQController.getFAQsByService);

// Protected routes
router.use(authenticate);

router.post(
  '/',
  authorize(['faq.create']),
  validate(createFAQSchema),
  sanitizeHTML(['answer.fa', 'answer.en']),
  auditLog('CREATE_FAQ', 'faq'),
  FAQController.createFAQ
);

router.get('/', authorize(['faq.read']), FAQController.getFAQs);

router.get('/:id', authorize(['faq.read']), FAQController.getFAQById);

router.put(
  '/:id',
  authorize(['faq.update']),
  validate(updateFAQSchema),
  sanitizeHTML(['answer.fa', 'answer.en']),
  auditLog('UPDATE_FAQ', 'faq'),
  FAQController.updateFAQ
);

router.delete(
  '/:id',
  authorize(['faq.delete']),
  auditLog('DELETE_FAQ', 'faq'),
  FAQController.deleteFAQ
);

export default router;
