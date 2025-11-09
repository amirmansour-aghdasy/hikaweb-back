import { CalendarService } from './service.js';
import { AppError } from '../../utils/appError.js';
import { HTTP_STATUS } from '../../utils/httpStatus.js';

export class CalendarController {
  /**
   * @swagger
   * /api/v1/calendar:
   *   post:
   *     summary: ایجاد رویداد جدید
   *     tags: [Calendar]
   *     security:
   *       - bearerAuth: []
   */
  static async createEvent(req, res, next) {
    try {
      // Transform attendees array to proper format
      const eventData = {
        ...req.body,
        attendees: req.body.attendees?.map(userId => ({
          user: userId,
          status: 'pending'
        })) || []
      };

      const event = await CalendarService.createEvent(eventData, req.user.id);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'رویداد با موفقیت ایجاد شد',
        data: { event }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/calendar:
   *   get:
   *     summary: دریافت لیست رویدادها
   *     tags: [Calendar]
   *     security:
   *       - bearerAuth: []
   */
  static async getEvents(req, res, next) {
    try {
      const filters = {
        ...req.query,
        page: req.query.page || 1,
        limit: req.query.limit || 50
      };

      // If not admin, only show user's events
      const userRole = req.user.role?.name || req.user.role;
      const userId = (userRole !== 'super_admin' && userRole !== 'admin') 
        ? req.user.id 
        : null;

      const result = await CalendarService.getEvents(filters, userId);

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
   * /api/v1/calendar/range:
   *   get:
   *     summary: دریافت رویدادها در بازه زمانی
   *     tags: [Calendar]
   *     security:
   *       - bearerAuth: []
   */
  static async getEventsByDateRange(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        throw new AppError('تاریخ شروع و پایان الزامی است', HTTP_STATUS.BAD_REQUEST);
      }

      const userRole = req.user.role?.name || req.user.role;
      const userId = (userRole !== 'super_admin' && userRole !== 'admin') 
        ? req.user.id 
        : null;

      const events = await CalendarService.getEventsByDateRange(startDate, endDate, userId);

      res.json({
        success: true,
        data: events
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/calendar/upcoming:
   *   get:
   *     summary: دریافت رویدادهای پیش‌رو
   *     tags: [Calendar]
   *     security:
   *       - bearerAuth: []
   */
  static async getUpcomingEvents(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const events = await CalendarService.getUpcomingEvents(req.user.id, limit);

      res.json({
        success: true,
        data: events
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/calendar/{id}:
   *   get:
   *     summary: دریافت یک رویداد
   *     tags: [Calendar]
   *     security:
   *       - bearerAuth: []
   */
  static async getEventById(req, res, next) {
    try {
      const userRole = req.user.role?.name || req.user.role;
      const userId = (userRole !== 'super_admin' && userRole !== 'admin') 
        ? req.user.id 
        : null;

      const event = await CalendarService.getEventById(req.params.id, userId);

      res.json({
        success: true,
        data: { event }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/calendar/{id}:
   *   put:
   *     summary: ویرایش رویداد
   *     tags: [Calendar]
   *     security:
   *       - bearerAuth: []
   */
  static async updateEvent(req, res, next) {
    try {
      // Transform attendees array if provided
      const updateData = { ...req.body };
      if (req.body.attendees) {
        updateData.attendees = req.body.attendees.map(userId => ({
          user: userId,
          status: 'pending'
        }));
      }

      const event = await CalendarService.updateEvent(req.params.id, updateData, req.user.id);

      res.json({
        success: true,
        message: 'رویداد با موفقیت ویرایش شد',
        data: { event }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/calendar/{id}:
   *   delete:
   *     summary: حذف رویداد
   *     tags: [Calendar]
   *     security:
   *       - bearerAuth: []
   */
  static async deleteEvent(req, res, next) {
    try {
      await CalendarService.deleteEvent(req.params.id, req.user.id);

      res.json({
        success: true,
        message: 'رویداد با موفقیت حذف شد'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/calendar/{id}/respond:
   *   post:
   *     summary: پاسخ به دعوت رویداد
   *     tags: [Calendar]
   *     security:
   *       - bearerAuth: []
   */
  static async respondToEvent(req, res, next) {
    try {
      const event = await CalendarService.respondToEvent(
        req.params.id,
        req.user.id,
        req.body.status
      );

      res.json({
        success: true,
        message: 'پاسخ شما ثبت شد',
        data: { event }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/calendar/reminders/send:
   *   post:
   *     summary: ارسال یادآوری‌ها (برای cron job)
   *     tags: [Calendar]
   *     security:
   *       - bearerAuth: []
   */
  static async sendReminders(req, res, next) {
    try {
      // Only super admin can trigger this manually
      const userRole = req.user.role?.name || req.user.role;
      if (userRole !== 'super_admin') {
        throw new AppError('دسترسی محدود', HTTP_STATUS.FORBIDDEN);
      }

      const result = await CalendarService.sendReminders();

      res.json({
        success: true,
        message: 'یادآوری‌ها ارسال شدند',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/calendar/statistics:
   *   get:
   *     summary: دریافت آمار تقویم
   *     tags: [Calendar]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: آمار تقویم
   */
  static async getStatistics(req, res, next) {
    try {
      const userRole = req.user.role?.name || req.user.role;
      const userId = (userRole !== 'super_admin' && userRole !== 'admin') 
        ? req.user.id 
        : null;

      const statistics = await CalendarService.getCalendarStatistics(userId);

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      next(error);
    }
  }
}

