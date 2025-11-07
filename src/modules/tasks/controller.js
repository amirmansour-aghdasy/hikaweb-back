import { TaskService } from './service.js';
import { AppError } from '../../utils/appError.js';
import { HTTP_STATUS } from '../../utils/httpStatus.js';

export class TaskController {
  /**
   * @swagger
   * /api/v1/tasks:
   *   post:
   *     summary: ایجاد وظیفه جدید
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - assignee
   *             properties:
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               assignee:
   *                 type: string
   *               priority:
   *                 type: string
   *                 enum: [low, normal, high, urgent]
   *               dueDate:
   *                 type: string
   *                 format: date-time
   *     responses:
   *       201:
   *         description: وظیفه با موفقیت ایجاد شد
   */
  static async createTask(req, res, next) {
    try {
      const task = await TaskService.createTask(req.body, req.user.id);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'وظیفه با موفقیت ایجاد شد',
        data: { task }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/tasks:
   *   get:
   *     summary: دریافت لیست وظایف
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: assignee
   *         schema:
   *           type: string
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *       - in: query
   *         name: priority
   *         schema:
   *           type: string
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: لیست وظایف
   */
  static async getTasks(req, res, next) {
    try {
      const filters = {
        ...req.query,
        page: req.query.page || 1,
        limit: req.query.limit || 25
      };

      // If not admin, only show user's tasks
      const userRole = req.user.role?.name || req.user.role;
      const userId = (userRole !== 'super_admin' && userRole !== 'admin') 
        ? req.user.id 
        : null;

      const result = await TaskService.getTasks(filters, userId);

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
   * /api/v1/tasks/{id}:
   *   get:
   *     summary: دریافت یک وظیفه
   *     tags: [Tasks]
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
   *         description: اطلاعات وظیفه
   */
  static async getTaskById(req, res, next) {
    try {
      const userRole = req.user.role?.name || req.user.role;
      const userId = (userRole !== 'super_admin' && userRole !== 'admin') 
        ? req.user.id 
        : null;

      const task = await TaskService.getTaskById(req.params.id, userId);

      res.json({
        success: true,
        data: { task }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/tasks/{id}:
   *   put:
   *     summary: ویرایش وظیفه
   *     tags: [Tasks]
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
   *         description: وظیفه با موفقیت ویرایش شد
   */
  static async updateTask(req, res, next) {
    try {
      const task = await TaskService.updateTask(req.params.id, req.body, req.user.id);

      res.json({
        success: true,
        message: 'وظیفه با موفقیت ویرایش شد',
        data: { task }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/tasks/{id}:
   *   delete:
   *     summary: حذف وظیفه
   *     tags: [Tasks]
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
   *         description: وظیفه با موفقیت حذف شد
   */
  static async deleteTask(req, res, next) {
    try {
      await TaskService.deleteTask(req.params.id, req.user.id);

      res.json({
        success: true,
        message: 'وظیفه با موفقیت حذف شد'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/tasks/{id}/comments:
   *   post:
   *     summary: افزودن نظر به وظیفه
   *     tags: [Tasks]
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
   *         description: نظر با موفقیت افزوده شد
   */
  static async addComment(req, res, next) {
    try {
      const task = await TaskService.addComment(
        req.params.id,
        req.user.id,
        req.body.content
      );

      res.json({
        success: true,
        message: 'نظر با موفقیت افزوده شد',
        data: { task }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/tasks/statistics:
   *   get:
   *     summary: دریافت آمار وظایف
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: آمار وظایف
   */
  static async getStatistics(req, res, next) {
    try {
      const userRole = req.user.role?.name || req.user.role;
      const userId = (userRole !== 'super_admin' && userRole !== 'admin') 
        ? req.user.id 
        : null;

      const statistics = await TaskService.getTaskStatistics(userId);

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      next(error);
    }
  }
}

