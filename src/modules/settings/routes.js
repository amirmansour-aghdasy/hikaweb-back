import { Router } from 'express';
import { SettingsController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import { updateSettingsSchema } from './validation.js';

const router = Router();

// Public routes
router.get('/public', SettingsController.getPublicSettings);
router.get('/maintenance', SettingsController.getMaintenanceStatus);

// Protected routes
router.use(authenticate);

router.get('/', authorize(['settings.read']), SettingsController.getSettings);

router.put(
  '/',
  authorize(['settings.update']),
  validate(updateSettingsSchema),
  auditLog('UPDATE_SETTINGS', 'settings'),
  SettingsController.updateSettings
);

export default router;
