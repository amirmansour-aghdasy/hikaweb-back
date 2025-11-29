import { TicketService } from './service.js';
import { Ticket } from './model.js';
import { User } from '../auth/model.js';
import { logger } from '../../utils/logger.js';

export class TicketController {
  /**
   * @swagger
   * /api/v1/tickets:
   *   post:
   *     summary: ایجاد تیکت جدید
   *     tags: [Tickets]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - subject
   *               - description
   *               - department
   *             properties:
   *               subject:
   *                 type: string
   *                 minLength: 5
   *                 maxLength: 200
   *               description:
   *                 type: string
   *                 minLength: 10
   *               department:
   *                 type: string
   *                 enum: [technical, sales, support, billing, general]
   *               priority:
   *                 type: string
   *                 enum: [low, normal, high, urgent, critical]
   *                 default: normal
   *               category:
   *                 type: string
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       201:
   *         description: تیکت با موفقیت ایجاد شد
   */
  static async createTicket(req, res, next) {
    try {
      // Map status to ticketStatus if provided
      if (req.body.status) {
        req.body.ticketStatus = req.body.status;
        delete req.body.status;
      }

      const ticket = await TicketService.createTicket(req.body, req.user.id);

      // Transform ticketStatus to status for frontend compatibility
      const ticketObj = ticket.toObject ? ticket.toObject() : ticket;
      const transformedTicket = {
        ...ticketObj,
        status: ticketObj.ticketStatus || 'open'
      };

      res.status(201).json({
        success: true,
        message: req.t('tickets.createSuccess'),
        data: { ticket: transformedTicket }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/tickets:
   *   get:
   *     summary: دریافت لیست تیکت‌ها
   *     tags: [Tickets]
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
   *         name: department
   *         schema:
   *           type: string
   *           enum: [technical, sales, support, billing, general]
   *       - in: query
   *         name: priority
   *         schema:
   *           type: string
   *           enum: [low, normal, high, urgent, critical]
   *       - in: query
   *         name: ticketStatus
   *         schema:
   *           type: string
   *           enum: [open, in_progress, waiting_response, resolved, closed, cancelled]
   *     responses:
   *       200:
   *         description: لیست تیکت‌ها دریافت شد
   */
  static async getTickets(req, res, next) {
    try {
      const user = await User.findById(req.user.id).populate('role');
      const result = await TicketService.getTickets(req.query, req.user.id, user.role);

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
   * /api/v1/tickets/{id}:
   *   get:
   *     summary: دریافت جزئیات تیکت
   *     tags: [Tickets]
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
   *         description: جزئیات تیکت دریافت شد
   *       404:
   *         description: تیکت یافت نشد
   *       403:
   *         description: دسترسی غیرمجاز
   */
  static async getTicketById(req, res, next) {
    try {
      const ticket = await Ticket.findById(req.params.id)
        .populate('customer', 'name email avatar')
        .populate('assignedTo', 'name email avatar')
        .populate('category', 'name')
        .populate('messages.author', 'name avatar');

      if (!ticket || ticket.deletedAt) {
        return res.status(404).json({
          success: false,
          message: req.t('tickets.notFound')
        });
      }

      // Check access permissions
      const user = await User.findById(req.user.id).populate('role');
      const isCustomer = ticket.customer._id.toString() === req.user.id;
      const hasAdminAccess =
        user.role.permissions.includes('tickets.read') ||
        user.role.permissions.includes('admin.all');

      if (!isCustomer && !hasAdminAccess) {
        return res.status(403).json({
          success: false,
          message: req.t('auth.accessDenied')
        });
      }

      // Filter internal messages for customers
      if (isCustomer) {
        ticket.messages = ticket.messages.filter(msg => !msg.isInternal);
      }

      // Transform ticketStatus to status for frontend compatibility
      const ticketObj = ticket.toObject ? ticket.toObject() : ticket;
      const transformedTicket = {
        ...ticketObj,
        status: ticketObj.ticketStatus || 'open'
      };

      res.json({
        success: true,
        data: { ticket: transformedTicket }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/tickets/{id}:
   *   put:
   *     summary: به‌روزرسانی تیکت
   *     tags: [Tickets]
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
   *               subject:
   *                 type: string
   *               description:
   *                 type: string
   *               priority:
   *                 type: string
   *                 enum: [low, normal, high, urgent, critical]
   *               ticketStatus:
   *                 type: string
   *                 enum: [open, in_progress, waiting_response, resolved, closed, cancelled]
   *               assignedTo:
   *                 type: string
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       200:
   *         description: تیکت با موفقیت به‌روزرسانی شد
   */
  static async updateTicket(req, res, next) {
    try {
      const ticket = await TicketService.updateTicket(req.params.id, req.body, req.user.id);

      // Transform ticketStatus to status for frontend compatibility
      const ticketObj = ticket.toObject ? ticket.toObject() : ticket;
      const transformedTicket = {
        ...ticketObj,
        status: ticketObj.ticketStatus || 'open'
      };

      res.json({
        success: true,
        message: req.t('tickets.updateSuccess'),
        data: { ticket: transformedTicket }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/tickets/{id}/messages:
   *   post:
   *     summary: افزودن پیام به تیکت
   *     tags: [Tickets]
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
   *               - content
   *             properties:
   *               content:
   *                 type: string
   *                 minLength: 1
   *               isInternal:
   *                 type: boolean
   *                 default: false
   *     responses:
   *       200:
   *         description: پیام با موفقیت اضافه شد
   */
  static async addMessage(req, res, next) {
    try {
      const ticket = await TicketService.addMessage(req.params.id, req.body, req.user.id);

      // Transform ticketStatus to status for frontend compatibility
      const ticketObj = ticket.toObject ? ticket.toObject() : ticket;
      const transformedTicket = {
        ...ticketObj,
        status: ticketObj.ticketStatus || 'open'
      };

      res.json({
        success: true,
        message: req.t('tickets.messageAdded'),
        data: { ticket: transformedTicket }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/tickets/{id}/assign:
   *   patch:
   *     summary: واگذاری تیکت
   *     tags: [Tickets]
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
   *     responses:
   *       200:
   *         description: تیکت با موفقیت واگذار شد
   */
  static async assignTicket(req, res, next) {
    try {
      const { assignedTo } = req.body;
      const ticket = await TicketService.assignTicket(req.params.id, assignedTo, req.user.id);

      // Transform ticketStatus to status for frontend compatibility
      const ticketObj = ticket.toObject ? ticket.toObject() : ticket;
      const transformedTicket = {
        ...ticketObj,
        status: ticketObj.ticketStatus || 'open'
      };

      res.json({
        success: true,
        message: req.t('tickets.assignSuccess'),
        data: { ticket: transformedTicket }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/tickets/{id}/close:
   *   patch:
   *     summary: بستن تیکت
   *     tags: [Tickets]
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
   *               - summary
   *             properties:
   *               summary:
   *                 type: string
   *                 minLength: 10
   *     responses:
   *       200:
   *         description: تیکت با موفقیت بسته شد
   */
  static async closeTicket(req, res, next) {
    try {
      const ticket = await TicketService.closeTicket(req.params.id, req.body, req.user.id);

      // Transform ticketStatus to status for frontend compatibility
      const ticketObj = ticket.toObject ? ticket.toObject() : ticket;
      const transformedTicket = {
        ...ticketObj,
        status: ticketObj.ticketStatus || 'open'
      };

      res.json({
        success: true,
        message: req.t('tickets.closeSuccess'),
        data: { ticket: transformedTicket }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/tickets/stats:
   *   get:
   *     summary: دریافت آمار تیکت‌ها
   *     tags: [Tickets]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: آمار تیکت‌ها دریافت شد
   */
  static async getTicketStats(req, res, next) {
    try {
      const user = await User.findById(req.user.id).populate('role');
      const hasAdminAccess =
        user.role.permissions.includes('tickets.read') ||
        user.role.permissions.includes('admin.all');

      if (!hasAdminAccess) {
        return res.status(403).json({
          success: false,
          message: req.t('auth.accessDenied')
        });
      }

      const stats = await Ticket.aggregate([
        {
          $match: { deletedAt: null }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            open: {
              $sum: {
                $cond: [{ $eq: ['$ticketStatus', 'open'] }, 1, 0]
              }
            },
            inProgress: {
              $sum: {
                $cond: [{ $eq: ['$ticketStatus', 'in_progress'] }, 1, 0]
              }
            },
            resolved: {
              $sum: {
                $cond: [{ $eq: ['$ticketStatus', 'resolved'] }, 1, 0]
              }
            },
            closed: {
              $sum: {
                $cond: [{ $eq: ['$ticketStatus', 'closed'] }, 1, 0]
              }
            },
            avgResolutionTime: { $avg: '$resolution.resolutionTime' }
          }
        }
      ]);

      const departmentStats = await Ticket.aggregate([
        {
          $match: { deletedAt: null }
        },
        {
          $group: {
            _id: '$department',
            count: { $sum: 1 }
          }
        }
      ]);

      const priorityStats = await Ticket.aggregate([
        {
          $match: { deletedAt: null }
        },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          overview: stats[0] || {},
          byDepartment: departmentStats,
          byPriority: priorityStats
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/tickets/{id}:
   *   delete:
   *     summary: حذف تیکت
   *     tags: [Tickets]
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
   *         description: تیکت با موفقیت حذف شد
   *       404:
   *         description: تیکت یافت نشد
   *       403:
   *         description: دسترسی غیرمجاز
   */
  static async deleteTicket(req, res, next) {
    try {
      await TicketService.deleteTicket(req.params.id, req.user.id);

      res.json({
        success: true,
        message: req.t('tickets.deleteSuccess')
      });
    } catch (error) {
      next(error);
    }
  }
}
