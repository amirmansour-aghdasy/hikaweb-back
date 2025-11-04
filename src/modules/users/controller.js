import { Role } from './roleModel.js';
import { User } from '../auth/model.js';
import { UserService } from './service.js';

export class UserController {
  /**
   * @swagger
   * /api/v1/users:
   *   post:
   *     summary: ایجاد کاربر جدید
   *     tags: [Users]
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
   *               - email
   *               - role
   *             properties:
   *               name:
   *                 type: string
   *               email:
   *                 type: string
   *                 format: email
   *               phoneNumber:
   *                 type: string
   *               password:
   *                 type: string
   *                 minLength: 8
   *               role:
   *                 type: string
   *               language:
   *                 type: string
   *                 enum: [fa, en]
   *     responses:
   *       201:
   *         description: کاربر با موفقیت ایجاد شد
   */
  static async createUser(req, res, next) {
    try {
      const user = await UserService.createUser(req.body, req.user.id);

      res.status(201).json({
        success: true,
        message: req.t('users.createSuccess'),
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/users:
   *   get:
   *     summary: دریافت لیست کاربران
   *     tags: [Users]
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
   *         name: role
   *         schema:
   *           type: string
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [active, inactive, archived]
   *     responses:
   *       200:
   *         description: لیست کاربران دریافت شد
   */
  static async getUsers(req, res, next) {
    try {
      const result = await UserService.getUsers(req.query);

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
   * /api/v1/users/{id}:
   *   get:
   *     summary: دریافت جزئیات کاربر
   *     tags: [Users]
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
   *         description: جزئیات کاربر دریافت شد
   *       404:
   *         description: کاربر یافت نشد
   */
  static async getUserById(req, res, next) {
    try {
      const user = await User.findById(req.params.id).populate(
        'role',
        'name displayName permissions'
      );

      if (!user || user.deletedAt) {
        return res.status(404).json({
          success: false,
          message: req.t('users.notFound')
        });
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/users/{id}:
   *   put:
   *     summary: ویرایش کاربر
   *     tags: [Users]
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
   *               name:
   *                 type: string
   *               email:
   *                 type: string
   *                 format: email
   *               phoneNumber:
   *                 type: string
   *               role:
   *                 type: string
   *               language:
   *                 type: string
   *                 enum: [fa, en]
   *               status:
   *                 type: string
   *                 enum: [active, inactive, archived]
   *     responses:
   *       200:
   *         description: کاربر با موفقیت ویرایش شد
   *       404:
   *         description: کاربر یافت نشد
   */
  static async updateUser(req, res, next) {
    try {
      const user = await UserService.updateUser(req.params.id, req.body, req.user.id);

      res.json({
        success: true,
        message: req.t('users.updateSuccess'),
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/users/{id}:
   *   delete:
   *     summary: حذف کاربر
   *     tags: [Users]
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
   *         description: کاربر با موفقیت حذف شد
   *       404:
   *         description: کاربر یافت نشد
   */
  static async deleteUser(req, res, next) {
    try {
      await UserService.deleteUser(req.params.id, req.user.id);

      res.json({
        success: true,
        message: req.t('users.deleteSuccess')
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/users/roles:
   *   get:
   *     summary: دریافت لیست نقش‌ها
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: لیست نقش‌ها دریافت شد
   */
  static async getRoles(req, res, next) {
    try {
      const roles = await Role.find({ deletedAt: null }).sort({ priority: -1 });

      res.json({
        success: true,
        data: { roles }
      });
    } catch (error) {
      next(error);
    }
  }
}
