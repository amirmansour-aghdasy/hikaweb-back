import { ConsultationService } from './service.js';
import { Consultation } from './model.js';
import { logger } from '../../utils/logger.js';

export class ConsultationController {
  /**
   * @swagger
   * /api/v1/consultations:
   *   post:
   *     summary: ثبت درخواست مشاوره
   *     tags: [Consultations]
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
   *               - services
   *               - projectDescription
   *               - budget
   *               - timeline
   *     responses:
   *       201:
   *         description: درخواست مشاوره ثبت شد
   */
  static async createConsultation(req, res, next) {
    try {
      const consultation = await ConsultationService.createConsultation(req.body);

      res.status(201).json({
        success: true,
        message: req.t('consultations.submitSuccess') || 'درخواست مشاوره با موفقیت ثبت شد',
        data: { consultation }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Simple consultation form endpoint for homepage
   */
  static async createSimpleConsultation(req, res, next) {
    try {
      // Pass userId if user is authenticated
      const userId = req.user?.id || null;
      const consultation = await ConsultationService.createSimpleConsultation(req.body, userId);

      res.status(201).json({
        success: true,
        message: 'درخواست مشاوره شما با موفقیت ثبت شد. به زودی با شما تماس خواهیم گرفت.',
        data: { consultation }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/consultations:
   *   get:
   *     summary: دریافت لیست درخواست‌های مشاوره
   *     tags: [Consultations]
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
   *       - in: query
   *         name: requestStatus
   *         schema:
   *           type: string
   *           enum: [new, contacted, in_discussion, proposal_sent, accepted, rejected, converted]
   *     responses:
   *       200:
   *         description: لیست درخواست‌ها دریافت شد
   */
  /**
   * Get consultations for the authenticated user (regular users)
   */
  static async getMyConsultations(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.id;
      // Get user with role populated
      const User = (await import('../auth/model.js')).User;
      const user = await User.findById(userId).populate('role');
      const userRole = user?.role || null;

      // For regular users, always filter by user
      const result = await ConsultationService.getConsultations(req.query, userId, userRole, false);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getConsultations(req, res, next) {
    try {
      // Get user info if authenticated
      let userId = null;
      let userRole = null;
      
      // Check if this is a dashboard request
      // Dashboard requests typically include 'all=true' or 'customer' filter
      // Since this route requires authentication and authorization, and dashboard is admin-only,
      // we can assume requests here are from dashboard (unless explicitly filtered)
      const isDashboardRequest = req.query.all === 'true' || req.query.all === true || req.query.customer;
      
      if (req.user) {
        userId = req.user.id;
        // Get user with role populated
        const User = (await import('../auth/model.js')).User;
        const user = await User.findById(userId).populate('role');
        if (user && user.role) {
          userRole = user.role;
        }
      }

      const result = await ConsultationService.getConsultations(req.query, userId, userRole, isDashboardRequest);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/consultations/{id}:
   *   get:
   *     summary: دریافت جزئیات درخواست مشاوره
   *     tags: [Consultations]
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
   *         description: جزئیات درخواست دریافت شد
   *       404:
   *         description: درخواست مشاوره یافت نشد
   */
  static async getConsultationById(req, res, next) {
    try {
      const consultation = await Consultation.findById(req.params.id)
        .populate('services', 'name')
        .populate('assignedTo', 'name email');

      if (!consultation || consultation.deletedAt) {
        return res.status(404).json({
          success: false,
          message: req.t('consultations.notFound')
        });
      }

      res.json({
        success: true,
        data: { consultation }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/consultations/{id}:
   *   put:
   *     summary: ویرایش درخواست مشاوره
   *     tags: [Consultations]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               requestStatus:
   *                 type: string
   *                 enum: [new, contacted, in_discussion, proposal_sent, accepted, rejected, converted]
   *               notes:
   *                 type: string
   *     responses:
   *       200:
   *         description: درخواست مشاوره با موفقیت ویرایش شد
   *       404:
   *         description: درخواست مشاوره یافت نشد
   */
  static async updateConsultation(req, res, next) {
    try {
      const consultation = await ConsultationService.updateConsultation(
        req.params.id,
        req.body,
        req.user.id
      );

      res.json({
        success: true,
        message: req.t('consultations.updateSuccess'),
        data: { consultation }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/consultations/{id}/assign:
   *   patch:
   *     summary: واگذاری درخواست مشاوره به کاربر
   *     tags: [Consultations]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - assignedTo
   *             properties:
   *               assignedTo:
   *                 type: string
   *                 description: ID کاربر برای واگذاری
   *     responses:
   *       200:
   *         description: درخواست مشاوره با موفقیت واگذار شد
   *       404:
   *         description: درخواست مشاوره یا کاربر یافت نشد
   */
  static async assignConsultation(req, res, next) {
    try {
      const { assignedTo } = req.body;
      const consultation = await ConsultationService.assignConsultation(
        req.params.id,
        assignedTo,
        req.user.id
      );

      res.json({
        success: true,
        message: 'درخواست مشاوره با موفقیت واگذار شد',
        data: { consultation }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/consultations/{id}:
   *   delete:
   *     summary: حذف درخواست مشاوره
   *     tags: [Consultations]
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
   *         description: درخواست مشاوره با موفقیت حذف شد
   *       404:
   *         description: درخواست مشاوره یافت نشد
   */
  static async deleteConsultation(req, res, next) {
    try {
      await ConsultationService.deleteConsultation(req.params.id, req.user.id);

      res.json({
        success: true,
        message: req.t('consultations.deleteSuccess')
      });
    } catch (error) {
      next(error);
    }
  }
}
