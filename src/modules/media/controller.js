import { MediaService } from './service.js';
import { Media } from './model.js';
import { logger } from '../../utils/logger.js';

export class MediaController {
  /**
   * @swagger
   * /api/v1/media/upload:
   *   post:
   *     summary: آپلود فایل رسانه
   *     tags: [Media]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *               folder:
   *                 type: string
   *                 default: /
   *               title_fa:
   *                 type: string
   *               title_en:
   *                 type: string
   *               altText_fa:
   *                 type: string
   *               altText_en:
   *                 type: string
   *     responses:
   *       201:
   *         description: فایل با موفقیت آپلود شد
   *       400:
   *         description: فایل نامعتبر یا خطای اعتبارسنجی
   */
  static async uploadFile(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: req.t('media.fileRequired')
        });
      }

      const metadata = {
        folder: req.body.folder || '/',
        title: {
          fa: req.body.title_fa || '',
          en: req.body.title_en || ''
        },
        altText: {
          fa: req.body.altText_fa || '',
          en: req.body.altText_en || ''
        }
      };

      const media = await MediaService.uploadFile(req.file, req.user, metadata);

      res.status(201).json({
        success: true,
        message: req.t('media.uploadSuccess'),
        data: { media }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/media:
   *   get:
   *     summary: دریافت فایل‌های رسانه با صفحه‌بندی
   *     tags: [Media]
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
   *           default: 20
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *       - in: query
   *         name: fileType
   *         schema:
   *           type: string
   *           enum: [image, video, audio, document, archive, other]
   *       - in: query
   *         name: folder
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: فایل‌های رسانه با موفقیت دریافت شدند
   */
  static async getMedia(req, res, next) {
    try {
      const result = await MediaService.getMedia(req.query);

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
   * /api/v1/media/{id}:
   *   get:
   *     summary: دریافت تک فایل رسانه
   *     tags: [Media]
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
   *         description: فایل رسانه دریافت شد
   *       404:
   *         description: رسانه یافت نشد
   */
  static async getMediaById(req, res, next) {
    try {
      const media = await Media.findById(req.params.id).populate('uploadedBy', 'name email');

      if (!media) {
        return res.status(404).json({
          success: false,
          message: req.t('media.notFound')
        });
      }

      res.json({
        success: true,
        data: { media }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/media/{id}:
   *   put:
   *     summary: به‌روزرسانی اطلاعات رسانه
   *     tags: [Media]
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
   *               title:
   *                 type: object
   *                 properties:
   *                   fa:
   *                     type: string
   *                   en:
   *                     type: string
   *               altText:
   *                 type: object
   *                 properties:
   *                   fa:
   *                     type: string
   *                   en:
   *                     type: string
   *               caption:
   *                 type: object
   *                 properties:
   *                   fa:
   *                     type: string
   *                   en:
   *                     type: string
   *               description:
   *                 type: object
   *                 properties:
   *                   fa:
   *                     type: string
   *                   en:
   *                     type: string
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       200:
   *         description: رسانه با موفقیت به‌روزرسانی شد
   *       404:
   *         description: رسانه یافت نشد
   */
  static async updateMedia(req, res, next) {
    try {
      const media = await Media.findById(req.params.id);

      if (!media) {
        return res.status(404).json({
          success: false,
          message: req.t('media.notFound')
        });
      }

      // Update fields
      Object.assign(media, req.body);
      media.updatedBy = req.user.id;

      await media.save();

      res.json({
        success: true,
        message: req.t('media.updateSuccess'),
        data: { media }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/media/{id}:
   *   delete:
   *     summary: حذف فایل رسانه
   *     tags: [Media]
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
   *         description: رسانه با موفقیت حذف شد
   *       404:
   *         description: رسانه یافت نشد
   *       409:
   *         description: رسانه در حال استفاده است
   */
  static async deleteMedia(req, res, next) {
    try {
      await MediaService.deleteFile(req.params.id, req.user);

      res.json({
        success: true,
        message: req.t('media.deleteSuccess')
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/media/folders:
   *   post:
   *     summary: ایجاد پوشه رسانه
   *     tags: [Media]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - folderPath
   *             properties:
   *               folderPath:
   *                 type: string
   *     responses:
   *       201:
   *         description: پوشه با موفقیت ایجاد شد
   */
  static async createFolder(req, res, next) {
    try {
      const { folderPath } = req.body;

      await MediaService.createFolder(folderPath, req.user);

      res.status(201).json({
        success: true,
        message: req.t('media.folderCreated')
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/media/bulk-upload:
   *   post:
   *     summary: آپلود چندین فایل همزمان
   *     tags: [Media]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               files:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary
   *               folder:
   *                 type: string
   *                 default: /
   *     responses:
   *       201:
   *         description: فایل‌ها با موفقیت آپلود شدند
   */
  static async bulkUpload(req, res, next) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'فایلی برای آپلود انتخاب نشده است'
        });
      }

      const uploadedFiles = [];
      const errors = [];

      for (const file of req.files) {
        try {
          const metadata = {
            folder: req.body.folder || '/'
          };

          const media = await MediaService.uploadFile(file, req.user, metadata);
          uploadedFiles.push(media);
        } catch (error) {
          errors.push({
            filename: file.originalname,
            error: error.message
          });
        }
      }

      res.status(201).json({
        success: true,
        message: `${uploadedFiles.length} فایل با موفقیت آپلود شد`,
        data: {
          uploaded: uploadedFiles,
          errors: errors
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
