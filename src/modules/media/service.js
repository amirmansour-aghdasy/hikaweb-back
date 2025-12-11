import path from 'path';
import crypto from 'crypto';
import multer from 'multer';

import { Media } from './model.js';
import { Bucket } from './bucketModel.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/environment.js';
import { AppError } from '../../utils/appError.js';
import { HTTP_STATUS } from '../../utils/httpStatus.js';
// FileProcessor no longer needed - we only get dimensions, no variants
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
      // Get or create bucket
      let bucket;
      if (metadata.bucketId) {
        bucket = await Bucket.findById(metadata.bucketId);
        if (!bucket) {
          throw new Error('Bucket یافت نشد');
        }
      } else {
        // Use default bucket or create one
        bucket = await Bucket.findOne({ name: 'default' });
        if (!bucket) {
          bucket = await this.createBucket({
            name: 'default',
            displayName: 'پیش‌فرض',
            region: 'ir-thr-at1',
            isPublic: true, // Default bucket should be public for media files
            createdBy: user.id
          });
        } else {
          // Ensure default bucket is public
          if (bucket.isPublic === false) {
            bucket.isPublic = true;
            await bucket.save();
          }
        }
      }

      // Get file type category (inline function - no need for FileProcessor)
      const getFileTypeCategory = (mimeType) => {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType.includes('pdf') || mimeType.includes('document')) return 'document';
        return 'other';
      };
      
      // Generate unique filename (inline function - no need for FileProcessor)
      const generateUniqueFilename = (originalName) => {
        const ext = path.extname(originalName);
        return `${Date.now()}-${crypto.randomUUID()}${ext}`;
      };
      
      const fileType = getFileTypeCategory(file.mimetype);
      const uniqueFilename = generateUniqueFilename(file.originalname);
      const folder = metadata.folder || '/';
      // Remove leading slash from folder and ensure key doesn't start with /
      const cleanFolder = folder.replace(/^\/+/, '').replace(/\/+$/, '');
      const key = cleanFolder ? `${cleanFolder}/${uniqueFilename}` : uniqueFilename;

      let dimensions = null;
      let variants = [];

      // Process images - Only get dimensions, no variants
      if (fileType === 'image') {
        // Use sharp to get metadata only (no processing/resizing)
        const sharp = (await import('sharp')).default;
        const metadata = await sharp(file.buffer).metadata();
        dimensions = {
          width: metadata.width,
          height: metadata.height
        };

        // Upload original only - no variants
        // Use actual Arvan bucket name from config, not MongoDB bucket name
        const arvanBucketName = config.ARVAN_OBJECT_STORAGE_BUCKET || config.ARVAN_DRIVE_BUCKET;
        const arvanRegion = bucket.region || config.ARVAN_OBJECT_STORAGE_REGION || config.ARVAN_DRIVE_REGION || 'ir-thr-at1';
        
        const originalUrl = await arvanObjectStorageService.uploadFile(
          file.buffer, 
          key, 
          file.mimetype, 
          {
            type: 'original',
            isPublic: bucket.isPublic !== false // Default to true (public-read) unless explicitly set to false
          },
          arvanBucketName,
          arvanRegion
        );

        // No variants - empty array
        variants = [];

        // Create media record
        const mediaRecord = new Media({
          filename: uniqueFilename,
          originalName: file.originalname,
          url: originalUrl.url,
          thumbnailUrl: originalUrl.url, // Use original as thumbnail since no variants
          mimeType: file.mimetype,
          fileType,
          size: file.size,
          dimensions,
          uploadedBy: user.id,
          bucket: bucket._id,
          folder,
          variants, // Empty array - no variants
          ...metadata
        });

        await mediaRecord.save();
        
        // Update bucket statistics
        await bucket.updateStatistics();
        
        return mediaRecord;
      } else {
        // Handle non-image files
        // Use actual Arvan bucket name from config, not MongoDB bucket name
        const arvanBucketName = config.ARVAN_OBJECT_STORAGE_BUCKET || config.ARVAN_DRIVE_BUCKET;
        const arvanRegion = bucket.region || config.ARVAN_OBJECT_STORAGE_REGION || config.ARVAN_DRIVE_REGION || 'ir-thr-at1';
        
        const uploadResult = await arvanObjectStorageService.uploadFile(
          file.buffer, 
          key, 
          file.mimetype, 
          {
            isPublic: bucket.isPublic !== false // Default to true (public-read) unless explicitly set to false
          },
          arvanBucketName,
          arvanRegion
        );

        const mediaRecord = new Media({
          filename: uniqueFilename,
          originalName: file.originalname,
          url: uploadResult.url,
          mimeType: file.mimetype,
          fileType,
          size: file.size,
          uploadedBy: user.id,
          bucket: bucket._id,
          folder,
          ...metadata
        });

        await mediaRecord.save();
        
        // Update bucket statistics
        await bucket.updateStatistics();
        
        return mediaRecord;
      }
    } catch (error) {
      logger.error('File upload error:', error);
      throw error;
    }
  }

  static async deleteFile(mediaId, user) {
    try {
      const media = await Media.findById(mediaId).populate('bucket');

      if (!media) {
        throw new Error('رسانه یافت نشد');
      }

      if (media.usageCount > 0) {
        // Build detailed error message with usage information
        const usageDetails = media.usedIn.map(usage => {
          const resourceTypeMap = {
            'Article': 'مقاله',
            'Service': 'خدمت',
            'Portfolio': 'نمونه کار',
            'TeamMember': 'عضو تیم',
            'Brand': 'برند',
            'Carousel': 'اسلایدر'
          };
          const resourceTypeLabel = resourceTypeMap[usage.resourceType] || usage.resourceType;
          return `${resourceTypeLabel} (${usage.field || 'فیلد نامشخص'})`;
        }).join('، ');
        
        const errorMessage = `فایل "${media.originalName}" در حال استفاده است و قابل حذف نیست. این فایل در موارد زیر استفاده شده: ${usageDetails}`;
        throw AppError.conflict(errorMessage);
      }

      // Extract key from URL
      // URL format: https://s3.ir-thr-at1.arvanstorage.ir/bucket-name/path/to/file.jpg
      const url = new URL(media.url);
      const pathParts = url.pathname.split('/').filter(p => p);
      // Use actual Arvan bucket name from config, not MongoDB bucket name
      const arvanBucketName = config.ARVAN_OBJECT_STORAGE_BUCKET || config.ARVAN_DRIVE_BUCKET;
      const arvanRegion = media.bucket?.region || config.ARVAN_OBJECT_STORAGE_REGION || config.ARVAN_DRIVE_REGION || 'ir-thr-at1';
      
      // Try to find bucket name in URL path, otherwise use config bucket name
      const bucketIndex = pathParts.findIndex(p => p === arvanBucketName);
      const key = bucketIndex >= 0 ? pathParts.slice(bucketIndex + 1).join('/') : pathParts.join('/');

      await arvanObjectStorageService.deleteFile(key, arvanBucketName, arvanRegion);

      // Delete variants
      if (media.variants && media.variants.length > 0) {
        for (const variant of media.variants) {
          const variantUrl = new URL(variant.url);
          const variantPathParts = variantUrl.pathname.split('/').filter(p => p);
          const variantBucketIndex = variantPathParts.findIndex(p => p === arvanBucketName);
          const variantKey = variantBucketIndex >= 0 ? variantPathParts.slice(variantBucketIndex + 1).join('/') : variantPathParts.join('/');
          await arvanObjectStorageService.deleteFile(variantKey, arvanBucketName, arvanRegion);
        }
      }

      await Media.findByIdAndDelete(mediaId);

      // Update bucket statistics
      if (media.bucket) {
        await media.bucket.updateStatistics();
      }

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
        bucket = '',
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
      if (bucket) query.bucket = bucket;
      if (folder) query.folder = folder;
      if (uploadedBy) query.uploadedBy = uploadedBy;

      const skip = (parsedPage - 1) * parsedLimit;

      const [media, total] = await Promise.all([
        Media.find(query)
          .populate('uploadedBy', 'name email')
          .populate({
            path: 'bucket',
            select: 'name displayName region',
            strictPopulate: false // Allow null if bucket doesn't exist
          })
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

  static async createFolder(folderPath, bucketId, user) {
    try {
      const bucket = await Bucket.findById(bucketId);
      if (!bucket) {
        throw new Error('Bucket یافت نشد');
      }

      const normalizedPath = folderPath.startsWith('/') ? folderPath : `/${folderPath}`;

      // Create empty file to represent folder
      const key = `${normalizedPath}/.gitkeep`;
      await arvanObjectStorageService.uploadFile(
        Buffer.from(''), 
        key, 
        'text/plain', 
        {
          type: 'folder',
          createdBy: user.id,
          isPublic: false
        },
        bucket.name,
        bucket.region
      );

      logger.info(`Folder created: ${normalizedPath} in bucket ${bucket.name} by ${user.email}`);
      return true;
    } catch (error) {
      logger.error('Folder creation error:', error);
      throw error;
    }
  }

  /**
   * Create a new bucket
   */
  static async createBucket(bucketData) {
    try {
      const { name, displayName, description, region, isPublic, versioningEnabled, createdBy } = bucketData;

      // Check if bucket with same name exists
      const existingBucket = await Bucket.findOne({ name });
      if (existingBucket) {
        throw new Error('Bucket با این نام قبلاً وجود دارد');
      }

      // Create bucket in Arvan
      await arvanObjectStorageService.createBucket(name, {
        region: region || 'ir-thr-at1',
        isPublic: isPublic || false,
        versioningEnabled: versioningEnabled || false
      });

      // Create bucket record in database
      const bucket = new Bucket({
        name,
        displayName,
        description,
        region: region || 'ir-thr-at1',
        isPublic: isPublic || false,
        versioningEnabled: versioningEnabled || false,
        createdBy
      });

      await bucket.save();

      logger.info(`Bucket created: ${name} by user ${createdBy}`);
      return bucket;
    } catch (error) {
      logger.error('Bucket creation error:', error);
      throw error;
    }
  }

  /**
   * Get all buckets
   */
  static async getBuckets(filters = {}) {
    try {
      const { page = 1, limit = 50, search = '' } = filters;
      const parsedPage = parseInt(page) || 1;
      const parsedLimit = parseInt(limit) || 50;

      let query = { deletedAt: null };

      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { displayName: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') }
        ];
      }

      const skip = (parsedPage - 1) * parsedLimit;

      const [buckets, total] = await Promise.all([
        Bucket.find(query)
          .populate('createdBy', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parsedLimit),
        Bucket.countDocuments(query)
      ]);

      // Update statistics for each bucket
      for (const bucket of buckets) {
        await bucket.updateStatistics();
      }

      return {
        data: buckets,
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
      logger.error('Get buckets error:', error);
      throw error;
    }
  }

  /**
   * Get bucket by ID
   */
  static async getBucketById(bucketId) {
    try {
      const bucket = await Bucket.findById(bucketId)
        .populate('createdBy', 'name email');

      if (!bucket) {
        throw new Error('Bucket یافت نشد');
      }

      // Update statistics
      await bucket.updateStatistics();

      return bucket;
    } catch (error) {
      logger.error('Get bucket error:', error);
      throw error;
    }
  }

  /**
   * Get folders in a bucket
   */
  static async getFolders(bucketId, parentFolder = '/') {
    try {
      const bucket = await Bucket.findById(bucketId);
      if (!bucket) {
        throw new Error('Bucket یافت نشد');
      }

      // Get folders from media records
      const folders = await Media.distinct('folder', {
        bucket: bucketId,
        deletedAt: null,
        folder: { $regex: `^${parentFolder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` }
      });

      // Also get folders from S3
      const s3Folders = await arvanObjectStorageService.listObjects(bucket.name, parentFolder, bucket.region);

      // Combine and deduplicate
      const allFolders = new Set([
        ...folders,
        ...s3Folders.folders
      ]);

      return Array.from(allFolders).filter(f => f !== parentFolder && f.startsWith(parentFolder));
    } catch (error) {
      logger.error('Get folders error:', error);
      throw error;
    }
  }

  /**
   * Delete bucket
   */
  static async deleteBucket(bucketId, user) {
    try {
      const bucket = await Bucket.findById(bucketId);
      if (!bucket) {
        throw new Error('Bucket یافت نشد');
      }

      // Check if bucket has files
      const fileCount = await Media.countDocuments({ bucket: bucketId, deletedAt: null });
      if (fileCount > 0) {
        throw new Error('Bucket دارای فایل است و قابل حذف نیست');
      }

      // Soft delete
      await bucket.softDelete(user.id);

      logger.info(`Bucket deleted: ${bucket.name} by ${user.email}`);
      return true;
    } catch (error) {
      logger.error('Bucket deletion error:', error);
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
        // Process the edited image - use inline functions (no FileProcessor needed)
        const getFileTypeCategory = (mimeType) => {
          if (mimeType.startsWith('image/')) return 'image';
          if (mimeType.startsWith('video/')) return 'video';
          if (mimeType.startsWith('audio/')) return 'audio';
          if (mimeType.includes('pdf') || mimeType.includes('document')) return 'document';
          return 'other';
        };
        
        const generateUniqueFilename = (originalName) => {
          const ext = path.extname(originalName);
          return `${Date.now()}-${crypto.randomUUID()}${ext}`;
        };
        
        const fileType = getFileTypeCategory(editOptions.file.mimetype);
        const uniqueFilename = generateUniqueFilename(editOptions.file.originalname || `edited-${media.filename}`);
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
