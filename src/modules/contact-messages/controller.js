import { ContactMessageService } from './service.js';
import { logger } from '../../utils/logger.js';

export class ContactMessageController {
  /**
   * @swagger
   * /api/v1/contact-messages:
   *   post:
   *     summary: ارسال پیام تماس با ما
   *     tags: [Contact Messages]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - fullName
   *               - email
   *               - phoneNumber
   *               - message
   *             properties:
   *               fullName:
   *                 type: string
   *                 minLength: 2
   *                 maxLength: 100
   *               email:
   *                 type: string
   *                 format: email
   *               phoneNumber:
   *                 type: string
   *                 pattern: '^(\+98|0)?9\d{9}$'
   *               message:
   *                 type: string
   *                 minLength: 10
   *                 maxLength: 2000
   *     responses:
   *       201:
   *         description: پیام با موفقیت ارسال شد
   */
  static async createContactMessage(req, res, next) {
    try {
      // Pass userId if user is authenticated
      const userId = req.user?.id || null;
      const contactMessage = await ContactMessageService.createContactMessage(req.body, userId);

      res.status(201).json({
        success: true,
        message: 'پیام شما با موفقیت ارسال شد. به زودی با شما تماس خواهیم گرفت.',
        data: { contactMessage }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/contact-messages:
   *   get:
   *     summary: دریافت لیست پیام‌های تماس با ما
   *     tags: [Contact Messages]
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
   *           default: 10
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *              - in: query
       *         name: status
       *         schema:
       *           type: string
       *           enum: [new, read, archived]
   *     responses:
   *       200:
   *         description: لیست پیام‌ها دریافت شد
   */
  static async getContactMessages(req, res, next) {
    try {
      const result = await ContactMessageService.getContactMessages(req.query);

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
   * /api/v1/contact-messages/{id}:
   *   get:
   *     summary: دریافت پیام تماس با ما
   *     tags: [Contact Messages]
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
   *         description: پیام دریافت شد
   */
  static async getContactMessageById(req, res, next) {
    try {
      const message = await ContactMessageService.getContactMessageById(req.params.id);

      res.json({
        success: true,
        data: { contactMessage: message }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/contact-messages/{id}:
   *   patch:
   *     summary: به‌روزرسانی پیام تماس با ما
   *     tags: [Contact Messages]
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
   *         description: پیام به‌روزرسانی شد
   */
  static async updateContactMessage(req, res, next) {
    try {
      const message = await ContactMessageService.updateContactMessage(
        req.params.id,
        req.body,
        req.user.id
      );

      res.json({
        success: true,
        message: req.t('contactMessages.updateSuccess') || 'پیام به‌روزرسانی شد',
        data: { contactMessage: message }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/contact-messages/{id}/read:
   *   patch:
   *     summary: علامت‌گذاری پیام به عنوان خوانده شده
   *     tags: [Contact Messages]
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
   *         description: پیام به عنوان خوانده شده علامت‌گذاری شد
   */
  static async markAsRead(req, res, next) {
    try {
      const message = await ContactMessageService.markAsRead(req.params.id, req.user.id);

      res.json({
        success: true,
        message: 'پیام به عنوان خوانده شده علامت‌گذاری شد',
        data: { contactMessage: message }
      });
    } catch (error) {
      next(error);
    }
  }

  // Reply functionality removed - use ticket system instead

  /**
   * @swagger
   * /api/v1/contact-messages/{id}:
   *   delete:
   *     summary: حذف پیام تماس با ما
   *     tags: [Contact Messages]
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
   *         description: پیام حذف شد
   */
  static async deleteContactMessage(req, res, next) {
    try {
      await ContactMessageService.deleteContactMessage(req.params.id);

      res.json({
        success: true,
        message: 'پیام حذف شد'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/contact-messages/stats:
   *   get:
   *     summary: دریافت آمار پیام‌های تماس با ما
   *     tags: [Contact Messages]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: آمار دریافت شد
   */
  static async getStats(req, res, next) {
    try {
      const stats = await ContactMessageService.getStats();

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      next(error);
    }
  }
}

