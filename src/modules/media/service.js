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
