import { SettingsService } from './service.js';
import { logger } from '../../utils/logger.js';

export class SettingsController {
  /**
   * @swagger
   * /api/v1/settings:
   *   get:
   *     summary: دریافت تنظیمات سایت
   *     tags: [Settings]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: تنظیمات سایت دریافت شد
   */
  static async getSettings(req, res, next) {
    try {
      const settings = await SettingsService.getSettings();

      res.json({
        success: true,
        data: { settings }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/settings/public:
   *   get:
   *     summary: دریافت تنظیمات عمومی سایت
   *     tags: [Settings]
   *     responses:
   *       200:
   *         description: تنظیمات عمومی دریافت شد
   */
  static async getPublicSettings(req, res, next) {
    try {
      const settings = await SettingsService.getPublicSettings();

      res.json({
        success: true,
        data: { settings }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/settings:
   *   put:
   *     summary: به‌روزرسانی تنظیمات سایت
   *     tags: [Settings]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               siteName:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               siteDescription:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               contact:
   *                 type: object
   *               socialMedia:
   *                 type: object
   *               seo:
   *                 type: object
   *     responses:
   *       200:
   *         description: تنظیمات با موفقیت به‌روزرسانی شد
   */
  static async updateSettings(req, res, next) {
    try {
      const settings = await SettingsService.updateSettings(req.body, req.user.id);

      res.json({
        success: true,
        message: 'تنظیمات با موفقیت به‌روزرسانی شد',
        data: { settings }
      });
    } catch (error) {
      next(error);
    }
  }
}
