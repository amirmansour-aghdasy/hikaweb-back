import { CategoryService } from './service.js';
import { Category } from './model.js';
import { logger } from '../../utils/logger.js';

export class CategoryController {
  /**
   * @swagger
   * /api/v1/categories:
   *   post:
   *     summary: ایجاد دسته‌بندی جدید
   *     tags: [Categories]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - slug
   *               - type
   *     responses:
   *       201:
   *         description: دسته‌بندی با موفقیت ایجاد شد
   */
  static async createCategory(req, res, next) {
    try {
      const category = await CategoryService.createCategory(req.body, req.user.id);

      res.status(201).json({
        success: true,
        message: 'دسته‌بندی با موفقیت ایجاد شد',
        data: { category }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/categories:
   *   get:
   *     summary: دریافت لیست دسته‌بندی‌ها
   *     tags: [Categories]
   *     parameters:
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [article, service, portfolio, faq]
   *       - in: query
   *         name: parent
   *         schema:
   *           type: string
   *       - in: query
   *         name: level
   *         schema:
   *           type: integer
   *           minimum: 0
   *           maximum: 2
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: لیست دسته‌بندی‌ها دریافت شد
   */
  static async getCategories(req, res, next) {
    try {
      const categories = await CategoryService.getCategories(req.query);

      res.json({
        success: true,
        data: { categories }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/categories/tree/{type}:
   *   get:
   *     summary: دریافت درخت دسته‌بندی‌ها
   *     tags: [Categories]
   *     parameters:
   *       - in: path
   *         name: type
   *         required: true
   *         schema:
   *           type: string
   *           enum: [article, service, portfolio, faq]
   *     responses:
   *       200:
   *         description: درخت دسته‌بندی دریافت شد
   */
  static async getCategoryTree(req, res, next) {
    try {
      const { type } = req.params;
      const tree = await CategoryService.getCategoryTree(type);

      res.json({
        success: true,
        data: { categoryTree: tree }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCategoryById(req, res, next) {
    try {
      const category = await Category.findById(req.params.id)
        .populate('parent', 'name')
        .populate('children', 'name');

      if (!category || category.deletedAt) {
        return res.status(404).json({
          success: false,
          message: 'دسته‌بندی یافت نشد'
        });
      }

      res.json({
        success: true,
        data: { category }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateCategory(req, res, next) {
    try {
      const category = await CategoryService.updateCategory(req.params.id, req.body, req.user.id);

      res.json({
        success: true,
        message: 'دسته‌بندی با موفقیت به‌روزرسانی شد',
        data: { category }
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCategory(req, res, next) {
    try {
      await CategoryService.deleteCategory(req.params.id, req.user.id);

      res.json({
        success: true,
        message: 'دسته‌بندی با موفقیت حذف شد'
      });
    } catch (error) {
      next(error);
    }
  }
}
