import { NotificationService } from './service.js';

export class NotificationController {
  /**
   * @swagger
   * /api/v1/notifications:
   *   get:
   *     summary: دریافت اعلان‌های کاربر
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *       - in: query
   *         name: isRead
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: اعلان‌ها دریافت شدند
   */
  static async getNotifications(req, res, next) {
    try {
      const { page = 1, limit = 25, isRead, type } = req.query;
      
      const result = await NotificationService.getUserNotifications(req.user.id, {
        page: parseInt(page),
        limit: parseInt(limit),
        isRead: isRead === 'true' ? true : isRead === 'false' ? false : null,
        type
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/notifications/unread-count:
   *   get:
   *     summary: دریافت تعداد اعلان‌های خوانده نشده
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: تعداد اعلان‌های خوانده نشده
   */
  static async getUnreadCount(req, res, next) {
    try {
      const count = await NotificationService.getUnreadCount(req.user.id);

      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/notifications/{id}/read:
   *   patch:
   *     summary: علامت‌گذاری اعلان به عنوان خوانده شده
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: اعلان به عنوان خوانده شده علامت‌گذاری شد
   */
  static async markAsRead(req, res, next) {
    try {
      const notification = await NotificationService.markAsRead(req.params.id, req.user.id);

      res.json({
        success: true,
        data: notification,
        message: req.t('notifications.markedAsRead')
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/notifications/read-all:
   *   patch:
   *     summary: علامت‌گذاری همه اعلان‌ها به عنوان خوانده شده
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: همه اعلان‌ها به عنوان خوانده شده علامت‌گذاری شدند
   */
  static async markAllAsRead(req, res, next) {
    try {
      await NotificationService.markAllAsRead(req.user.id);

      res.json({
        success: true,
        message: req.t('notifications.allMarkedAsRead')
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/notifications/{id}:
   *   delete:
   *     summary: حذف اعلان
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: اعلان حذف شد
   */
  static async deleteNotification(req, res, next) {
    try {
      await NotificationService.deleteNotification(req.params.id, req.user.id);

      res.json({
        success: true,
        message: req.t('notifications.deleted')
      });
    } catch (error) {
      next(error);
    }
  }
}

