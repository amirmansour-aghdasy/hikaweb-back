import { RoleService } from './service.js';

export class RoleController {
  /**
   * @swagger
   * /api/v1/roles:
   *   post:
   *     summary: ایجاد نقش جدید
   *     tags: [Roles]
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
   *               - displayName
   *             properties:
   *               name:
   *                 type: string
   *               displayName:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               description:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               permissions:
   *                 type: array
   *                 items:
   *                   type: string
   *               priority:
   *                 type: number
   *     responses:
   *       201:
   *         description: نقش با موفقیت ایجاد شد
   */
  static async createRole(req, res, next) {
    try {
      const role = await RoleService.createRole(req.body, req.user.id);

      res.status(201).json({
        success: true,
        data: role,
        message: req.t('roles.createSuccess')
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/roles:
   *   get:
   *     summary: دریافت لیست نقش‌ها
   *     tags: [Roles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: لیست نقش‌ها دریافت شد
   */
  static async getRoles(req, res, next) {
    try {
      const result = await RoleService.getRoles({
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 25,
        search: req.query.search,
        status: req.query.status
      });

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
   * /api/v1/roles/{id}:
   *   get:
   *     summary: دریافت نقش با شناسه
   *     tags: [Roles]
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
   *         description: نقش دریافت شد
   */
  static async getRoleById(req, res, next) {
    try {
      const role = await RoleService.getRoleById(req.params.id);

      res.json({
        success: true,
        data: role
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/roles/{id}:
   *   put:
   *     summary: به‌روزرسانی نقش
   *     tags: [Roles]
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
   *               displayName:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               description:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               permissions:
   *                 type: array
   *                 items:
   *                   type: string
   *               priority:
   *                 type: number
   *     responses:
   *       200:
   *         description: نقش با موفقیت به‌روزرسانی شد
   */
  static async updateRole(req, res, next) {
    try {
      const role = await RoleService.updateRole(req.params.id, req.body, req.user.id);

      res.json({
        success: true,
        data: role,
        message: req.t('roles.updateSuccess')
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/roles/{id}:
   *   delete:
   *     summary: حذف نقش
   *     tags: [Roles]
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
   *         description: نقش با موفقیت حذف شد
   */
  static async deleteRole(req, res, next) {
    try {
      await RoleService.deleteRole(req.params.id, req.user.id);

      res.json({
        success: true,
        message: req.t('roles.deleteSuccess')
      });
    } catch (error) {
      next(error);
    }
  }
}

