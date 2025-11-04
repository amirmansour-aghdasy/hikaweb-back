import { AnalyticsService } from './service.js';

export class AnalyticsController {
  /**
   * @swagger
   * /api/v1/analytics/dashboard-stats:
   *   get:
   *     summary: دریافت آمار داشبورد
   *     tags: [Analytics]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: period
   *         schema:
   *           type: string
   *           enum: [7d, 30d, 90d, 1y]
   *           default: 30d
   *     responses:
   *       200:
   *         description: آمار داشبورد دریافت شد
   */
  static async getDashboardStats(req, res, next) {
    try {
      const { period = '30d' } = req.query;
      const stats = await AnalyticsService.getDashboardStats(period);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/analytics:
   *   get:
   *     summary: دریافت داده‌های آنالیتیکس
   *     tags: [Analytics]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: period
   *         schema:
   *           type: string
   *           enum: [7d, 30d, 90d, 1y]
   *           default: 30d
   *     responses:
   *       200:
   *         description: داده‌های آنالیتیکس دریافت شد
   */
  static async getAnalytics(req, res, next) {
    try {
      const { period = '30d' } = req.query;
      
      const [analyticsData, contentDistribution, topArticles, performanceMetrics] = await Promise.all([
        AnalyticsService.getAnalyticsData(period),
        AnalyticsService.getContentDistribution(),
        AnalyticsService.getTopArticles(10),
        AnalyticsService.getPerformanceMetrics(period)
      ]);

      res.json({
        success: true,
        data: {
          charts: analyticsData,
          contentDistribution,
          topArticles,
          performanceMetrics
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

