import { TeamService } from './service.js';
import { TeamMember } from './model.js';

export class TeamController {
  /**
   * @swagger
   * /api/v1/team:
   *   post:
   *     summary: ایجاد عضو جدید تیم
   *     tags: [Team]
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
   *               - position
   *               - avatar
   *               - department
   *             properties:
   *               name:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               slug:
   *                 type: string
   *               position:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               bio:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               avatar:
   *                 type: string
   *               department:
   *                 type: string
   *                 enum: [management, development, design, marketing, sales, support]
   *               email:
   *                 type: string
   *               phone:
   *                 type: string
   *               socialLinks:
   *                 type: object
   *               skills:
   *                 type: array
   *                 items:
   *                   type: string
   *               experience:
   *                 type: number
   *               joinDate:
   *                 type: string
   *                 format: date
   *               orderIndex:
   *                 type: number
   *               isPublic:
   *                 type: boolean
   *               status:
   *                 type: string
   *                 enum: [active, inactive, archived]
   *     responses:
   *       201:
   *         description: عضو تیم با موفقیت ایجاد شد
   *       400:
   *         description: خطا در اعتبارسنجی داده‌ها
   */
  static async createTeamMember(req, res, next) {
    try {
      const teamMember = await TeamService.createTeamMember(req.body, req.user.id);

      res.status(201).json({
        success: true,
        message: req.t('team.createSuccess'),
        data: { teamMember }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/team:
   *   get:
   *     summary: دریافت لیست اعضای تیم
   *     tags: [Team]
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
   *         name: status
   *         schema:
   *           type: string
   *           enum: [active, inactive, archived, all]
   *           default: active
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *       - in: query
   *         name: isPublic
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           default: orderIndex
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: asc
   *     responses:
   *       200:
   *         description: لیست اعضای تیم دریافت شد
   */
  static async getTeamMembers(req, res, next) {
    try {
      const result = await TeamService.getTeamMembers(req.query);

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
   * /api/v1/team/{id}:
   *   get:
   *     summary: دریافت جزئیات عضو تیم
   *     tags: [Team]
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
   *         description: جزئیات عضو تیم دریافت شد
   *       404:
   *         description: عضو تیم یافت نشد
   */
  static async getTeamMemberById(req, res, next) {
    try {
      const teamMember = await TeamMember.findById(req.params.id);

      if (!teamMember || teamMember.deletedAt) {
        return res.status(404).json({
          success: false,
          message: req.t('team.notFound')
        });
      }

      res.json({
        success: true,
        data: { teamMember }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/team/slug/{slug}:
   *   get:
   *     summary: دریافت عضو تیم با آدرس یکتا
   *     tags: [Team]
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: عضو تیم دریافت شد
   *       404:
   *         description: عضو تیم یافت نشد
   */
  static async getTeamMemberBySlug(req, res, next) {
    try {
      const teamMember = await TeamService.getTeamMemberBySlug(req.params.slug);

      res.json({
        success: true,
        data: { teamMember }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/team/{id}:
   *   put:
   *     summary: ویرایش عضو تیم
   *     tags: [Team]
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
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               position:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               bio:
   *                 $ref: '#/components/schemas/MultiLanguageText'
   *               avatar:
   *                 type: string
   *               email:
   *                 type: string
   *               phone:
   *                 type: string
   *               status:
   *                 type: string
   *                 enum: [active, inactive, archived]
   *     responses:
   *       200:
   *         description: عضو تیم با موفقیت ویرایش شد
   *       404:
   *         description: عضو تیم یافت نشد
   */
  static async updateTeamMember(req, res, next) {
    try {
      const teamMember = await TeamService.updateTeamMember(req.params.id, req.body, req.user.id);

      res.json({
        success: true,
        message: req.t('team.updateSuccess'),
        data: { teamMember }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/team/{id}:
   *   delete:
   *     summary: حذف عضو تیم
   *     tags: [Team]
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
   *         description: عضو تیم با موفقیت حذف شد
   *       404:
   *         description: عضو تیم یافت نشد
   */
  static async deleteTeamMember(req, res, next) {
    try {
      await TeamService.deleteTeamMember(req.params.id, req.user.id);

      res.json({
        success: true,
        message: req.t('team.deleteSuccess')
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/team/public:
   *   get:
   *     summary: دریافت اعضای عمومی تیم
   *     tags: [Team]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *     responses:
   *       200:
   *         description: اعضای عمومی تیم دریافت شدند
   */
  static async getPublicTeamMembers(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const teamMembers = await TeamService.getPublicTeamMembers(limit);

      res.json({
        success: true,
        data: { teamMembers }
      });
    } catch (error) {
      next(error);
    }
  }
}
