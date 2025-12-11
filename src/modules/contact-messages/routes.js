import { Router } from 'express';
import { ContactMessageController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import { contactLimiter } from '../../middleware/rateLimit.js';
import {
  createContactMessageSchema,
  updateContactMessageSchema
} from './validation.js';

const router = Router();

// Public route for creating contact messages (no auth required)
router.post(
  '/',
  contactLimiter,
  validate(createContactMessageSchema),
  optionalAuth, // Link to user if authenticated
  auditLog('CREATE_CONTACT_MESSAGE', 'contact-messages'),
  ContactMessageController.createContactMessage
);

// Protected routes (admin only)
router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

router.get('/', ContactMessageController.getContactMessages);
router.get('/stats', ContactMessageController.getStats);
router.get('/:id', ContactMessageController.getContactMessageById);
router.patch('/:id', validate(updateContactMessageSchema), ContactMessageController.updateContactMessage);
router.patch('/:id/read', ContactMessageController.markAsRead);
router.delete('/:id', ContactMessageController.deleteContactMessage);

export default router;

