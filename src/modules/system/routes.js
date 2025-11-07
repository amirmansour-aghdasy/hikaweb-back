import { Router } from 'express';
import { SystemController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin.all'));

router.get('/scheduler/status', SystemController.getSchedulerStatus);

export default router;

