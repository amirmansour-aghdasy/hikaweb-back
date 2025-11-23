import axios from 'axios';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand, CreateBucketCommand, PutBucketAclCommand, ListBucketsCommand, ListObjectsV2Command, HeadObjectCommand, GetBucketLocationCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/appError.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * Arvan Object Storage Service
 * Handles all interactions with Arvan Object Storage API
 */
class ArvanObjectStorageService {
  constructor() {
    this.baseURL = 'https://hikaweb.s3.ir-thr-at1.arvanstorage.ir';
    this.apiKey = config.ARVAN_OBJECT_STORAGE_API_KEY;
    this.accessKey = config.ARVAN_OBJECT_STORAGE_ACCESS_KEY;
    this.secretKey = config.ARVAN_OBJECT_STORAGE_SECRET_KEY;
    this.bucketName = config.ARVAN_OBJECT_STORAGE_BUCKET;
    this.region = config.ARVAN_OBJECT_STORAGE_REGION;
    
    // S3 endpoint for direct uploads
    this.s3Endpoint = `https://s3.${this.region}.arvanstorage.ir`;
    
    // Initialize axios instance
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `ApiKey ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Create S3Client instance
   */
  getS3Client(region = null) {
    const targetRegion = region || this.region;
    const endpoint = `https://s3.${targetRegion}.arvanstorage.ir`;
    
    return new S3Client({
      endpoint: endpoint,
      region: targetRegion,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.accessKey,
        secretAccessKey: this.secretKey
      }
    });
  }

  /**
   * Get bucket information
   */
  async getBucket(bucketName = null, region = null) {
    try {
      const bucket = bucketName || this.bucketName;
      const targetRegion = region || this.region;
      const s3Client = this.getS3Client(targetRegion);

      try {
        // Check if bucket exists
        await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
        
        // Get bucket location
        try {
          const locationCommand = new GetBucketLocationCommand({ Bucket: bucket });
          const locationResult = await s3Client.send(locationCommand);
          
          return {
            name: bucket,
            region: locationResult.LocationConstraint || targetRegion,
            exists: true
          };
        } catch (locationError) {
          // If we can't get location, just return that bucket exists
          return {
            name: bucket,
            region: targetRegion,
            exists: true
          };
        }
      } catch (error) {
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
          return { name: bucket, exists: false };
        }
        // If AccessDenied, assume bucket exists (we can't check but it might exist)
        // This is better than failing the upload
        if (error.name === 'AccessDenied' || error.name === 'Forbidden' || error.$metadata?.httpStatusCode === 403) {
          logger.warn(`Access denied checking bucket ${bucket}, assuming it exists`);
          return { name: bucket, exists: true, region: targetRegion };
        }
        throw error;
      }
    } catch (error) {
      logger.error('Error getting bucket:', error);
      throw new AppError('خطا در دریافت اطلاعات bucket', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Create bucket if not exists
   */
  async ensureBucket(bucketName = null, region = null) {
    const bucket = bucketName || this.bucketName;
    const targetRegion = region || this.region;
    
    try {
      // Check if bucket exists
      const bucketInfo = await this.getBucket(bucket, targetRegion);
      if (bucketInfo.exists) {
        return { exists: true, bucket, region: targetRegion };
      }
      
      // Bucket doesn't exist, create it
      // createBucket now handles BucketAlreadyExists gracefully
      await this.createBucket(bucket, { region: targetRegion });
      return { exists: false, created: true, bucket, region: targetRegion };
    } catch (error) {
      // If bucket already exists (race condition), that's fine
      if (error.name === 'BucketAlreadyExists' || error.name === 'BucketAlreadyOwnedByYou' || error.$metadata?.httpStatusCode === 409 || error.message?.includes('already exists')) {
        logger.info(`Bucket already exists (race condition): ${bucket}`);
        return { exists: true, bucket, region: targetRegion };
      }
      // If we can't check bucket (AccessDenied, etc.), assume it exists and continue
      // This allows uploads to proceed even if we can't verify bucket existence
      if (error.name === 'AccessDenied' || error.name === 'Forbidden' || error.$metadata?.httpStatusCode === 403 || error.message?.includes('AccessDenied') || error.message?.includes('Forbidden')) {
        logger.warn(`Cannot verify bucket ${bucket} existence (AccessDenied), assuming it exists`);
        return { exists: true, bucket, region: targetRegion };
      }
      // If it's an AppError from getBucket, also assume bucket exists
      if (error.name === 'AppError' && error.message?.includes('bucket')) {
        logger.warn(`Cannot verify bucket ${bucket} existence, assuming it exists`);
        return { exists: true, bucket, region: targetRegion };
      }
      logger.error('Error ensuring bucket:', error);
      throw error;
    }
  }

  /**
   * Create a new bucket
   */
  async createBucket(bucketName, options = {}) {
    const targetRegion = options.region || this.region;
    const s3Client = this.getS3Client(targetRegion);
    
    try {
      // Create bucket
      const createCommand = new CreateBucketCommand({
        Bucket: bucketName,
        CreateBucketConfiguration: {
          LocationConstraint: targetRegion
        }
      });
      await s3Client.send(createCommand);

      // Set bucket ACL if public
      if (options.isPublic) {
        const aclCommand = new PutBucketAclCommand({
          Bucket: bucketName,
          ACL: 'public-read'
        });
        await s3Client.send(aclCommand);
      }

      logger.info(`Bucket created: ${bucketName} in region ${targetRegion}`);
      return {
        name: bucketName,
        region: targetRegion,
        isPublic: options.isPublic || false
      };
    } catch (error) {
      // If bucket already exists, that's fine - just return success
      if (error.name === 'BucketAlreadyExists' || error.name === 'BucketAlreadyOwnedByYou' || error.$metadata?.httpStatusCode === 409) {
        logger.info(`Bucket already exists: ${bucketName} in region ${targetRegion}`);
        return {
          name: bucketName,
          region: targetRegion,
          isPublic: options.isPublic || false
        };
      }
      logger.error('Error creating bucket:', error);
      throw new AppError('خطا در ایجاد bucket', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * List all buckets
   */
  async listBuckets() {
    try {
      const s3Client = this.getS3Client();
      const command = new ListBucketsCommand({});
      const result = await s3Client.send(command);
      return result.Buckets || [];
    } catch (error) {
      logger.error('Error listing buckets:', error);
      throw new AppError('خطا در دریافت لیست bucket ها', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * List objects in a bucket (with folder support)
   */
  async listObjects(bucketName, prefix = '', region = null) {
    try {
      const targetRegion = region || this.region;
      const s3Client = this.getS3Client(targetRegion);

      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        Delimiter: '/'
      });

      const result = await s3Client.send(command);
      
      return {
        files: result.Contents || [],
        folders: result.CommonPrefixes?.map(p => p.Prefix) || []
      };
    } catch (error) {
      logger.error('Error listing objects:', error);
      throw new AppError('خطا در دریافت لیست فایل‌ها', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Upload file directly to S3-compatible endpoint using AWS SDK v3
   * This is more efficient than using the API
   */
  async uploadFile(buffer, key, contentType, metadata = {}, bucketName = null, region = null) {
    const targetBucket = bucketName || this.bucketName;
    const targetRegion = region || this.region;
    const endpoint = `https://s3.${targetRegion}.arvanstorage.ir`;
    
    try {
      // Log configuration for debugging
      logger.info('Upload configuration:', {
        bucket: targetBucket,
        region: targetRegion,
        endpoint: endpoint,
        key: key,
        contentType: contentType,
        hasAccessKey: !!this.accessKey,
        hasSecretKey: !!this.secretKey,
        accessKeyPrefix: this.accessKey ? this.accessKey.substring(0, 8) + '...' : 'missing'
      });

      const s3Client = this.getS3Client(targetRegion);

      // Ensure bucket exists
      await this.ensureBucket(targetBucket, targetRegion);

      // Extract isPublic from metadata (it's a boolean, not a string)
      // Default to true (public-read) for media files unless explicitly set to false
      const isPublic = metadata.isPublic !== false;
      // Create clean metadata object with only string values
      const cleanMetadata = { ...metadata };
      delete cleanMetadata.isPublic;
      // Convert all metadata values to strings (AWS S3 requirement)
      const stringMetadata = {};
      for (const [metaKey, value] of Object.entries(cleanMetadata)) {
        if (value !== undefined && value !== null) {
          stringMetadata[metaKey] = String(value);
        }
      }

      // Ensure key doesn't start with / to avoid creating empty folder
      const cleanKey = key.startsWith('/') ? key.substring(1) : key;
      
      // Use Upload from @aws-sdk/lib-storage for better performance with large files
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: targetBucket,
          Key: cleanKey,
          Body: buffer,
          ContentType: contentType,
          Metadata: stringMetadata,
          ACL: isPublic ? 'public-read' : 'private'
        }
      });

      const result = await upload.done();
      
      // Construct public URL
      // Arvan supports both path-style and virtual-hosted-style URLs
      // For public files, use virtual-hosted-style: https://bucket-name.s3.region.arvanstorage.ir/key
      // For path-style (with forcePathStyle): https://s3.region.arvanstorage.ir/bucket-name/key
      // Since we use forcePathStyle: true, we use path-style format
      const publicUrl = result.Location || `${endpoint}/${targetBucket}/${cleanKey}`;

      logger.info(`File uploaded: ${cleanKey} to bucket ${targetBucket} (${(buffer.length / 1024).toFixed(2)} KB)`);
      
      return {
        url: publicUrl,
        key: result.Key || cleanKey,
        etag: result.ETag ? result.ETag.replace(/"/g, '') : '',
        size: buffer.length,
        contentType,
        bucket: targetBucket,
        region: targetRegion
      };
    } catch (error) {
      logger.error('Error uploading file:', error);
      
      // Handle specific AWS S3 errors
      if (error.name === 'AccessDenied' || error.name === 'Forbidden' || error.$metadata?.httpStatusCode === 403) {
        const errorMessage = `دسترسی به bucket "${targetBucket}" رد شد. لطفاً credentials و permissions Arvan را بررسی کنید.`;
        logger.error(errorMessage, { 
          bucket: targetBucket, 
          region: targetRegion, 
          error: error.message,
          errorName: error.name,
          errorCode: error.Code,
          metadata: error.$metadata
        });
        throw new AppError(errorMessage, HTTP_STATUS.FORBIDDEN);
      }
      
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        const errorMessage = `Bucket "${targetBucket}" یافت نشد. لطفاً bucket را ایجاد کنید یا نام bucket را بررسی کنید.`;
        logger.error(errorMessage, { bucket: targetBucket, region: targetRegion });
        throw new AppError(errorMessage, HTTP_STATUS.NOT_FOUND);
      }
      
      if (error.name === 'InvalidAccessKeyId' || error.name === 'SignatureDoesNotMatch') {
        const errorMessage = 'Credentials Arvan نامعتبر است. لطفاً Access Key و Secret Key را بررسی کنید.';
        logger.error(errorMessage, { error: error.message });
        throw new AppError(errorMessage, HTTP_STATUS.UNAUTHORIZED);
      }
      
      throw new AppError(`خطا در آپلود فایل: ${error.message || 'خطای نامشخص'}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(key, bucketName = null, region = null) {
    try {
      const targetBucket = bucketName || this.bucketName;
      const targetRegion = region || this.region;
      const s3Client = this.getS3Client(targetRegion);

      // Ensure key doesn't start with /
      const cleanKey = key.startsWith('/') ? key.substring(1) : key;
      
      const command = new DeleteObjectCommand({
        Bucket: targetBucket,
        Key: cleanKey
      });

      await s3Client.send(command);

      logger.info(`File deleted: ${key} from bucket ${targetBucket}`);
      return true;
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw new AppError('خطا در حذف فایل', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get file URL (generate signed URL if private)
   */
  async getFileUrl(key, expiresIn = 3600, bucketName = null, region = null) {
    try {
      const targetBucket = bucketName || this.bucketName;
      const targetRegion = region || this.region;
      const endpoint = `https://s3.${targetRegion}.arvanstorage.ir`;
      const s3Client = this.getS3Client(targetRegion);

      // Ensure key doesn't start with /
      const cleanKey = key.startsWith('/') ? key.substring(1) : key;
      
      // Check if file is public
      try {
        const headCommand = new HeadObjectCommand({
          Bucket: targetBucket,
          Key: cleanKey
        });
        await s3Client.send(headCommand);
        
        // If public, return direct URL (path-style with forcePathStyle: true)
        return `${endpoint}/${targetBucket}/${cleanKey}`;
      } catch (error) {
        // If private or not found, generate signed URL
        const getObjectCommand = new GetObjectCommand({
          Bucket: targetBucket,
          Key: cleanKey
        });
        const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn });
        return url;
      }
    } catch (error) {
      logger.error('Error getting file URL:', error);
      throw new AppError('خطا در دریافت آدرس فایل', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Upload file from URL
   */
  async uploadFromUrl(sourceUrl, targetKey, options = {}) {
    try {
      const response = await this.api.post('/v1/upload/link', {
        bucket: this.bucketName,
        objects: [{
          url: sourceUrl,
          path: targetKey,
          isPublic: options.isPublic || false
        }]
      });

      logger.info(`File uploaded from URL: ${sourceUrl} -> ${targetKey}`);
      return response.data;
    } catch (error) {
      logger.error('Error uploading from URL:', error);
      throw new AppError('خطا در آپلود فایل از URL', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get storage usage report
   */
  async getStorageUsage(bucketName = null, reportDate = null) {
    try {
      const params = {};
      if (bucketName) params.bucket = bucketName;
      if (reportDate) params.reportDate = reportDate;

      const response = await this.api.get('/v1/reports/storage', { params });
      return response.data;
    } catch (error) {
      logger.error('Error getting storage usage:', error);
      throw new AppError('خطا در دریافت گزارش استفاده از فضای ذخیره‌سازی', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get traffic usage report
   */
  async getTrafficUsage(bucketName = null, reportDate = null) {
    try {
      const params = {};
      if (bucketName) params.bucket = bucketName;
      if (reportDate) params.reportDate = reportDate;

      const response = await this.api.get('/v1/reports/traffic', { params });
      return response.data;
    } catch (error) {
      logger.error('Error getting traffic usage:', error);
      throw new AppError('خطا در دریافت گزارش ترافیک', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }
}

export const arvanObjectStorageService = new ArvanObjectStorageService();

