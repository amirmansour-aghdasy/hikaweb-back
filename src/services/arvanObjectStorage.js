import axios from 'axios';
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
    this.baseURL = 'https://storage.arvanapis.ir';
    this.apiKey = config.ARVAN_OBJECT_STORAGE_API_KEY;
    this.accessKey = config.ARVAN_OBJECT_STORAGE_ACCESS_KEY;
    this.secretKey = config.ARVAN_OBJECT_STORAGE_SECRET_KEY;
    this.bucketName = config.ARVAN_OBJECT_STORAGE_BUCKET || config.ARVAN_DRIVE_BUCKET;
    this.region = config.ARVAN_OBJECT_STORAGE_REGION || config.ARVAN_DRIVE_REGION || 'ir-thr-at1';
    
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
   * Get bucket information
   */
  async getBucket(bucketName = null) {
    try {
      const bucket = bucketName || this.bucketName;
      const response = await this.api.get(`/v1/buckets/${bucket}`);
      return response.data;
    } catch (error) {
      logger.error('Error getting bucket:', error);
      throw new AppError('خطا در دریافت اطلاعات bucket', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Create bucket if not exists
   */
  async ensureBucket(bucketName = null) {
    try {
      const bucket = bucketName || this.bucketName;
      
      // Check if bucket exists
      try {
        await this.getBucket(bucket);
        return { exists: true, bucket };
      } catch (error) {
        // Bucket doesn't exist, create it
        if (error.response?.status === 404) {
          await this.createBucket(bucket);
          return { exists: false, created: true, bucket };
        }
        throw error;
      }
    } catch (error) {
      logger.error('Error ensuring bucket:', error);
      throw error;
    }
  }

  /**
   * Create a new bucket
   */
  async createBucket(bucketName, options = {}) {
    try {
      const response = await this.api.post('/v1/buckets', {
        name: bucketName,
        region: this.region,
        isPublic: options.isPublic || false,
        versioningEnabled: options.versioningEnabled || false,
        ...options
      });
      logger.info(`Bucket created: ${bucketName}`);
      return response.data;
    } catch (error) {
      logger.error('Error creating bucket:', error);
      throw new AppError('خطا در ایجاد bucket', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Upload file directly to S3-compatible endpoint
   * This is more efficient than using the API
   */
  async uploadFile(buffer, key, contentType, metadata = {}) {
    try {
      const AWS = (await import('aws-sdk')).default;
      
      const s3 = new AWS.S3({
        accessKeyId: this.accessKey,
        secretAccessKey: this.secretKey,
        endpoint: this.s3Endpoint,
        region: this.region,
        s3ForcePathStyle: true,
        signatureVersion: 'v4'
      });

      // Ensure bucket exists
      await this.ensureBucket();

      const params = {
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: metadata,
        ACL: metadata.isPublic ? 'public-read' : 'private'
      };

      const result = await s3.upload(params).promise();
      
      // Construct public URL
      // Arvan S3 returns Location in format: https://s3.region.arvanstorage.ir/bucket/key
      // We use the same format for consistency
      const publicUrl = result.Location || `${this.s3Endpoint}/${this.bucketName}/${key}`;

      logger.info(`File uploaded: ${key} (${(buffer.length / 1024).toFixed(2)} KB)`);
      
      return {
        url: publicUrl,
        key: result.Key,
        etag: result.ETag.replace(/"/g, ''),
        size: buffer.length,
        contentType
      };
    } catch (error) {
      logger.error('Error uploading file:', error);
      throw new AppError('خطا در آپلود فایل', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(key) {
    try {
      const AWS = (await import('aws-sdk')).default;
      
      const s3 = new AWS.S3({
        accessKeyId: this.accessKey,
        secretAccessKey: this.secretKey,
        endpoint: this.s3Endpoint,
        region: this.region,
        s3ForcePathStyle: true
      });

      await s3.deleteObject({
        Bucket: this.bucketName,
        Key: key
      }).promise();

      logger.info(`File deleted: ${key}`);
      return true;
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw new AppError('خطا در حذف فایل', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get file URL (generate signed URL if private)
   */
  async getFileUrl(key, expiresIn = 3600) {
    try {
      const AWS = (await import('aws-sdk')).default;
      
      const s3 = new AWS.S3({
        accessKeyId: this.accessKey,
        secretAccessKey: this.secretKey,
        endpoint: this.s3Endpoint,
        region: this.region,
        s3ForcePathStyle: true
      });

      // Check if file is public
      try {
        await s3.headObject({
          Bucket: this.bucketName,
          Key: key
        }).promise();
        
        // If public, return direct URL
        return `${this.s3Endpoint}/${this.bucketName}/${key}`;
      } catch (error) {
        // If private, generate signed URL
        const url = s3.getSignedUrl('getObject', {
          Bucket: this.bucketName,
          Key: key,
          Expires: expiresIn
        });
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

