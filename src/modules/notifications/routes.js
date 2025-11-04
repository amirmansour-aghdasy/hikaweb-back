import { Router } from 'express';
import { NotificationController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get user notifications
router.get('/', NotificationController.getNotifications);

// Get unread count
router.get('/unread-count', NotificationController.getUnreadCount);

// Mark as read
router.patch('/:id/read', NotificationController.markAsRead);

// Mark all as read
router.patch('/read-all', NotificationController.markAllAsRead);

// Delete notification
router.delete('/:id', NotificationController.deleteNotification);

export default router;

