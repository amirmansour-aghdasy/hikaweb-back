// ==========================================
// SRC/MODULES/MEDIA/SERVICE.JS
// ==========================================

import multer from 'multer';
import path from 'path';
import { Media } from './model.js';
import { FileProcessor } from '../../utils/fileProcessor.js';
import { arvanDriveService } from '../../config/arvanDrive.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/environment.js';

export class MediaService {
  static getMulterConfig() {
    return multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: config.MAX_FILE_SIZE
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'video/mp4',
          'video/avi',
          'video/mov',
          'audio/mp3',
          'audio/wav',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/zip',
          'application/x-rar-compressed'
        ];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('نوع فایل پشتیبانی نمی‌شود'), false);
        }
      }
    });
  }

  static async uploadFile(file, user, metadata = {}) {
    try {
      const fileType = FileProcessor.getFileTypeCategory(file.mimetype);
      const uniqueFilename = FileProcessor.generateUniqueFilename(file.originalname);
      const folder = metadata.folder || '/';
      const key = `${folder}${uniqueFilename}`.replace('//', '/');

      let dimensions = null;
      let variants = [];

      // Process images
      if (fileType === 'image') {
        const processed = await FileProcessor.processImage(file.buffer);
        dimensions = {
          width: processed.originalMetadata.width,
          height: processed.originalMetadata.height
        };

        // Upload original
        const originalUrl = await arvanDriveService.uploadFile(file.buffer, key, file.mimetype, {
          type: 'original'
        });

        // Upload variants
        for (const [sizeName, variant] of Object.entries(processed.variants)) {
          const variantKey = key.replace(path.extname(key), `-${sizeName}.webp`);
          const variantUrl = await arvanDriveService.uploadFile(
            variant.buffer,
            variantKey,
            'image/webp',
            { type: 'variant', size: sizeName }
          );

          variants.push({
            size: sizeName,
            url: variantUrl.url,
            width: variant.width,
            height: variant.height,
            fileSize: variant.size
          });
        }

        // Create media record
        const mediaRecord = new Media({
          filename: uniqueFilename,
          originalName: file.originalname,
          url: originalUrl.url,
          thumbnailUrl: variants.find(v => v.size === 'thumbnail')?.url,
          mimeType: file.mimetype,
          fileType,
          size: file.size,
          dimensions,
          uploadedBy: user.id,
          folder,
          variants,
          ...metadata
        });

        await mediaRecord.save();
        return mediaRecord;
      } else {
        // Handle non-image files
        const uploadResult = await arvanDriveService.uploadFile(file.buffer, key, file.mimetype);

        const mediaRecord = new Media({
          filename: uniqueFilename,
          originalName: file.originalname,
          url: uploadResult.url,
          mimeType: file.mimetype,
          fileType,
          size: file.size,
          uploadedBy: user.id,
          folder,
          ...metadata
        });

        await mediaRecord.save();
        return mediaRecord;
      }
    } catch (error) {
      logger.error('File upload error:', error);
      throw error;
    }
  }

  static async deleteFile(mediaId, user) {
    try {
      const media = await Media.findById(mediaId);

      if (!media) {
        throw new Error('رسانه یافت نشد');
      }

      if (media.usageCount > 0) {
        throw new Error('فایل در حال استفاده است و قابل حذف نیست');
      }

      // Extract key from URL
      const url = new URL(media.url);
      const key = url.pathname.substring(1); // Remove leading slash

      await arvanDriveService.deleteFile(key);

      // Delete variants
      if (media.variants && media.variants.length > 0) {
        for (const variant of media.variants) {
          const variantUrl = new URL(variant.url);
          const variantKey = variantUrl.pathname.substring(1);
          await arvanDriveService.deleteFile(variantKey);
        }
      }

      await Media.findByIdAndDelete(mediaId);

      logger.info(`Media deleted: ${media.originalName} by ${user.email}`);
      return true;
    } catch (error) {
      logger.error('Media deletion error:', error);
      throw error;
    }
  }

  static async getMedia(filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        fileType = '',
        folder = '',
        uploadedBy = ''
      } = filters;

      let query = { deletedAt: null };

      if (search) {
        query.$or = [
          { originalName: new RegExp(search, 'i') },
          { 'title.fa': new RegExp(search, 'i') },
          { 'title.en': new RegExp(search, 'i') }
        ];
      }

      if (fileType) query.fileType = fileType;
      if (folder) query.folder = folder;
      if (uploadedBy) query.uploadedBy = uploadedBy;

      const skip = (page - 1) * limit;

      const [media, total] = await Promise.all([
        Media.find(query)
          .populate('uploadedBy', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Media.countDocuments(query)
      ]);

      return {
        data: media,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Get media error:', error);
      throw error;
    }
  }

  static async createFolder(folderPath, user) {
    try {
      const normalizedPath = folderPath.startsWith('/') ? folderPath : `/${folderPath}`;

      // Create empty file to represent folder
      const key = `${normalizedPath}/.gitkeep`;
      await arvanDriveService.uploadFile(Buffer.from(''), key, 'text/plain', {
        type: 'folder',
        createdBy: user.id
      });

      logger.info(`Folder created: ${normalizedPath} by ${user.email}`);
      return true;
    } catch (error) {
      logger.error('Folder creation error:', error);
      throw error;
    }
  }
}

// ==========================================
// SRC/MODULES/MEDIA/VALIDATION.JS
// ==========================================

import Joi from 'joi';

export const mediaUpdateSchema = Joi.object({
  title: Joi.object({
    fa: Joi.string().allow('').optional(),
    en: Joi.string().allow('').optional()
  }).optional(),

  altText: Joi.object({
    fa: Joi.string().allow('').optional(),
    en: Joi.string().allow('').optional()
  }).optional(),

  caption: Joi.object({
    fa: Joi.string().allow('').optional(),
    en: Joi.string().allow('').optional()
  }).optional(),

  description: Joi.object({
    fa: Joi.string().allow('').optional(),
    en: Joi.string().allow('').optional()
  }).optional(),

  tags: Joi.array().items(Joi.string()).optional(),

  folder: Joi.string().optional()
});

export const folderCreateSchema = Joi.object({
  folderPath: Joi.string()
    .required()
    .min(1)
    .max(255)
    .pattern(/^[a-zA-Z0-9_\-\/]+$/)
    .messages({
      'string.pattern.base': 'نام پوشه فقط می‌تواند شامل حروف، اعداد، خط تیره و اسلش باشد',
      'any.required': 'مسیر پوشه الزامی است'
    })
});

// ==========================================
// SRC/MODULES/MEDIA/CONTROLLER.JS
// ==========================================

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

// ==========================================
// SRC/MODULES/MEDIA/ROUTES.JS
// ==========================================

import { Router } from 'express';
import { MediaController } from './controller.js';
import { MediaService } from './service.js';
import { validate } from '../../middleware/validation.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import { uploadLimiter } from '../../middleware/rateLimiting.js';
import { mediaUpdateSchema, folderCreateSchema } from './validation.js';

const router = Router();

// Setup multer
const upload = MediaService.getMulterConfig();

// All routes require authentication
router.use(authenticate);

// Upload single file
router.post(
  '/upload',
  uploadLimiter,
  authorize(['media.create']),
  upload.single('file'),
  auditLog('UPLOAD_MEDIA', 'media'),
  MediaController.uploadFile
);

// Bulk upload
router.post(
  '/bulk-upload',
  uploadLimiter,
  authorize(['media.create']),
  upload.array('files', 10), // Max 10 files
  auditLog('BULK_UPLOAD_MEDIA', 'media'),
  MediaController.bulkUpload
);

// Get media list
router.get('/', authorize(['media.read']), MediaController.getMedia);

// Get single media
router.get('/:id', authorize(['media.read']), MediaController.getMediaById);

// Update media metadata
router.put(
  '/:id',
  authorize(['media.update']),
  validate(mediaUpdateSchema),
  auditLog('UPDATE_MEDIA', 'media'),
  MediaController.updateMedia
);

// Delete media
router.delete(
  '/:id',
  authorize(['media.delete']),
  auditLog('DELETE_MEDIA', 'media'),
  MediaController.deleteMedia
);

// Create folder
router.post(
  '/folders',
  authorize(['media.create']),
  validate(folderCreateSchema),
  auditLog('CREATE_FOLDER', 'media'),
  MediaController.createFolder
);

export default router;
