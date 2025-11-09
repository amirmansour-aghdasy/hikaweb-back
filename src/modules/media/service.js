import path from 'path';

import multer from 'multer';

import { Media } from './model.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/environment.js';
import { FileProcessor } from '../../utils/fileProcessor.js';
import { arvanObjectStorageService } from '../../services/arvanObjectStorage.js';

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
        const originalUrl = await arvanObjectStorageService.uploadFile(file.buffer, key, file.mimetype, {
          type: 'original',
          isPublic: true
        });

        // Upload variants
        for (const [sizeName, variant] of Object.entries(processed.variants)) {
          const variantKey = key.replace(path.extname(key), `-${sizeName}.webp`);
          const variantUrl = await arvanObjectStorageService.uploadFile(
            variant.buffer,
            variantKey,
            'image/webp',
            { type: 'variant', size: sizeName, isPublic: true }
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
        const uploadResult = await arvanObjectStorageService.uploadFile(file.buffer, key, file.mimetype, {
          isPublic: true
        });

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
      // URL format: https://s3.ir-thr-at1.arvanstorage.ir/bucket-name/path/to/file.jpg
      const url = new URL(media.url);
      const pathParts = url.pathname.split('/').filter(p => p);
      // Remove bucket name (first part) and get the rest as key
      const bucketName = config.ARVAN_OBJECT_STORAGE_BUCKET || config.ARVAN_DRIVE_BUCKET;
      const bucketIndex = pathParts.findIndex(p => p === bucketName);
      const key = bucketIndex >= 0 ? pathParts.slice(bucketIndex + 1).join('/') : pathParts.join('/');

      await arvanObjectStorageService.deleteFile(key);

      // Delete variants
      if (media.variants && media.variants.length > 0) {
        for (const variant of media.variants) {
          const variantUrl = new URL(variant.url);
          const variantPathParts = variantUrl.pathname.split('/').filter(p => p);
          const variantBucketIndex = variantPathParts.findIndex(p => p === bucketName);
          const variantKey = variantBucketIndex >= 0 ? variantPathParts.slice(variantBucketIndex + 1).join('/') : variantPathParts.join('/');
          await arvanObjectStorageService.deleteFile(variantKey);
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
        limit = 25,
        search = '',
        fileType = '',
        folder = '',
        uploadedBy = ''
      } = filters;

      const parsedPage = parseInt(page) || 1;
      const parsedLimit = parseInt(limit) || 25;

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

      const skip = (parsedPage - 1) * parsedLimit;

      const [media, total] = await Promise.all([
        Media.find(query)
          .populate('uploadedBy', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parsedLimit),
        Media.countDocuments(query)
      ]);

      return {
        data: media,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit),
          hasNext: parsedPage < Math.ceil(total / parsedLimit),
          hasPrev: parsedPage > 1
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
      await arvanObjectStorageService.uploadFile(Buffer.from(''), key, 'text/plain', {
        type: 'folder',
        createdBy: user.id,
        isPublic: false
      });

      logger.info(`Folder created: ${normalizedPath} by ${user.email}`);
      return true;
    } catch (error) {
      logger.error('Folder creation error:', error);
      throw error;
    }
  }

  /**
   * Edit image (crop, resize, rotate, apply filters)
   */
  static async editImage(mediaId, editOptions, user) {
    try {
      const media = await Media.findById(mediaId);
      if (!media) {
        throw new Error('رسانه یافت نشد');
      }

      if (media.fileType !== 'image') {
        throw new Error('فقط تصاویر قابل ویرایش هستند');
      }

      // If a new file is uploaded (edited image from frontend)
      if (editOptions.file) {
        // Process the edited image
        const fileType = FileProcessor.getFileTypeCategory(editOptions.file.mimetype);
        const uniqueFilename = FileProcessor.generateUniqueFilename(editOptions.file.originalname || `edited-${media.filename}`);
        const folder = media.folder || '/';
        const key = `${folder}${uniqueFilename}`.replace('//', '/');

        // Upload edited image
        const uploadResult = await arvanObjectStorageService.uploadFile(
          editOptions.file.buffer,
          key,
          editOptions.file.mimetype,
          { type: 'edited', isPublic: true }
        );

        // Update media record with new URL
        media.url = uploadResult.url;
        media.filename = uniqueFilename;
        media.updatedBy = user.id;
        await media.save();

        logger.info(`Image edited: ${mediaId} by ${user.email}`);
        return media;
      }

      // If only edit options are provided (crop, rotate, etc.)
      // TODO: Implement server-side image processing using sharp
      // This would require downloading the image, processing it, and re-uploading
      
      logger.info(`Image edit options received: ${mediaId} by ${user.email}`);
      return media;
    } catch (error) {
      logger.error('Image editing error:', error);
      throw error;
    }
  }

  /**
   * Get media statistics
   */
  static async getMediaStatistics() {
    try {
      const [total, byFileType, totalSize] = await Promise.all([
        Media.countDocuments(),
        Media.aggregate([
          {
            $group: {
              _id: '$fileType',
              count: { $sum: 1 },
              totalSize: { $sum: '$size' }
            }
          }
        ]),
        Media.aggregate([
          {
            $group: {
              _id: null,
              totalSize: { $sum: '$size' }
            }
          }
        ])
      ]);

      return {
        total,
        byFileType: byFileType.reduce((acc, item) => {
          acc[item._id] = {
            count: item.count,
            totalSize: item.totalSize
          };
          return acc;
        }, {}),
        totalSize: totalSize[0]?.totalSize || 0
      };
    } catch (error) {
      logger.error('Error getting media statistics:', error);
      throw error;
    }
  }
}
