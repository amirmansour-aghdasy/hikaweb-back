import { Router } from 'express';
import { AnalyticsController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get dashboard statistics
router.get(
  '/dashboard-stats',
  authorize(['analytics.read', 'admin.all']),
  AnalyticsController.getDashboardStats
);

// Get analytics data
router.get(
  '/',
  authorize(['analytics.read', 'admin.all']),
  AnalyticsController.getAnalytics
);

export default router;

