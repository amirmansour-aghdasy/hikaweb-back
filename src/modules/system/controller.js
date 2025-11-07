import { schedulerService } from '../../services/scheduler.js';
import { AppError } from '../../utils/appError.js';
import { HTTP_STATUS } from '../../utils/httpStatus.js';

export class SystemController {
  /**
   * @swagger
   * /api/v1/system/scheduler/status:
   *   get:
   *     summary: دریافت وضعیت scheduler
   *     tags: [System]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: وضعیت scheduler
   */
  static async getSchedulerStatus(req, res, next) {
    try {
      const status = schedulerService.getStatus();

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      next(error);
    }
  }
}

