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
   *               - mobile
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
        message: req.t('consultations.submitSuccess'),
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
  static async getConsultations(req, res, next) {
    try {
      const result = await ConsultationService.getConsultations(req.query);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

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
}
