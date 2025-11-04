import { CommentService } from './service.js';
import { Comment } from './model.js';

export class CommentController {
  /**
   * @swagger
   * /api/v1/comments:
   *   post:
   *     summary: ایجاد نظر جدید
   *     tags: [Comments]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - content
   *               - rating
   *               - referenceType
   *               - referenceId
   *             properties:
   *               content:
   *                 type: string
   *                 minLength: 10
   *                 maxLength: 1000
   *               rating:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 5
   *               referenceType:
   *                 type: string
   *                 enum: [service, article, portfolio]
   *               referenceId:
   *                 type: string
   *               isAnonymous:
   *                 type: boolean
   *                 default: false
   *               authorName:
   *                 type: string
   *               authorEmail:
   *                 type: string
   *                 format: email
   *     responses:
   *       201:
   *         description: نظر با موفقیت ایجاد شد
   *       400:
   *         description: خطا در اعتبارسنجی داده‌ها
   */
  static async createComment(req, res, next) {
    try {
      const comment = await CommentService.createComment(req.body, req.user?.id);

      res.status(201).json({
        success: true,
        message: req.t('comments.createSuccess'),
        data: { comment }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/comments:
   *   get:
   *     summary: دریافت لیست نظرات
   *     tags: [Comments]
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
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, approved, rejected, all]
   *           default: approved
   *       - in: query
   *         name: referenceType
   *         schema:
   *           type: string
   *           enum: [service, article, portfolio]
   *       - in: query
   *         name: referenceId
   *         schema:
   *           type: string
   *       - in: query
   *         name: rating
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 5
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           default: createdAt
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *     responses:
   *       200:
   *         description: لیست نظرات دریافت شد
   */
  static async getComments(req, res, next) {
    try {
      const result = await CommentService.getComments(req.query);

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
   * /api/v1/comments/{referenceType}/{referenceId}:
   *   get:
   *     summary: دریافت نظرات یک آیتم خاص
   *     tags: [Comments]
   *     parameters:
   *       - in: path
   *         name: referenceType
   *         required: true
   *         schema:
   *           type: string
   *           enum: [service, article, portfolio]
   *       - in: path
   *         name: referenceId
   *         required: true
   *         schema:
   *           type: string
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
   *         name: sortBy
   *         schema:
   *           type: string
   *           default: createdAt
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *     responses:
   *       200:
   *         description: نظرات آیتم دریافت شد
   */
  static async getCommentsByReference(req, res, next) {
    try {
      const { referenceType, referenceId } = req.params;
      const result = await CommentService.getCommentsByReference(
        referenceType,
        referenceId,
        req.query
      );

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
   * /api/v1/comments/{id}:
   *   get:
   *     summary: دریافت جزئیات نظر
   *     tags: [Comments]
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
   *         description: جزئیات نظر دریافت شد
   *       404:
   *         description: نظر یافت نشد
   */
  static async getCommentById(req, res, next) {
    try {
      const comment = await Comment.findById(req.params.id).populate(
        'author',
        'firstName lastName avatar'
      );

      if (!comment || comment.deletedAt) {
        return res.status(404).json({
          success: false,
          message: req.t('comments.notFound')
        });
      }

      res.json({
        success: true,
        data: { comment }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/comments/{id}:
   *   put:
   *     summary: ویرایش نظر
   *     tags: [Comments]
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
   *               content:
   *                 type: string
   *               rating:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 5
   *     responses:
   *       200:
   *         description: نظر با موفقیت ویرایش شد
   *       404:
   *         description: نظر یافت نشد
   */
  static async updateComment(req, res, next) {
    try {
      const comment = await CommentService.updateComment(req.params.id, req.body, req.user.id);

      res.json({
        success: true,
        message: req.t('comments.updateSuccess'),
        data: { comment }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/comments/{id}/moderate:
   *   patch:
   *     summary: تایید یا رد نظر
   *     tags: [Comments]
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
   *               - status
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [approved, rejected]
   *               moderationNote:
   *                 type: string
   *     responses:
   *       200:
   *         description: نظر تایید/رد شد
   *       404:
   *         description: نظر یافت نشد
   */
  static async moderateComment(req, res, next) {
    try {
      const comment = await CommentService.moderateComment(req.params.id, req.body, req.user.id);

      res.json({
        success: true,
        message: req.t('comments.moderateSuccess'),
        data: { comment }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/comments/{id}:
   *   delete:
   *     summary: حذف نظر
   *     tags: [Comments]
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
   *         description: نظر با موفقیت حذف شد
   *       404:
   *         description: نظر یافت نشد
   */
  static async deleteComment(req, res, next) {
    try {
      await CommentService.deleteComment(req.params.id, req.user.id);

      res.json({
        success: true,
        message: req.t('comments.deleteSuccess')
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/comments/pending:
   *   get:
   *     summary: دریافت نظرات در انتظار تایید
   *     tags: [Comments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *     responses:
   *       200:
   *         description: نظرات در انتظار تایید دریافت شدند
   */
  static async getPendingComments(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const comments = await CommentService.getPendingComments(limit);

      res.json({
        success: true,
        data: { comments }
      });
    } catch (error) {
      next(error);
    }
  }
}
