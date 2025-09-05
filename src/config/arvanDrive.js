import AWS from 'aws-sdk';
import { config } from './environment.js';
import { logger } from '../utils/logger.js';

class ArvanDriveService {
  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: config.ARVAN_DRIVE_ACCESS_KEY,
      secretAccessKey: config.ARVAN_DRIVE_SECRET_KEY,
      endpoint: `https://s3.${config.ARVAN_DRIVE_REGION}.arvanstorage.ir`,
      region: config.ARVAN_DRIVE_REGION,
      s3ForcePathStyle: true
    });
    this.bucket = config.ARVAN_DRIVE_BUCKET;
  }

  async uploadFile(buffer, key, contentType, metadata = {}) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read',
        Metadata: metadata
      };

      const result = await this.s3.upload(params).promise();
      logger.info(`File uploaded: ${key}`);
      
      return {
        url: result.Location,
        key: result.Key,
        etag: result.ETag
      };
    } catch (error) {
      logger.error('Arvan upload failed:', error);
      throw error;
    }
  }

  async deleteFile(key) {
    try {
      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: key
      }).promise();
      logger.info(`File deleted: ${key}`);
    } catch (error) {
      logger.error('Arvan delete failed:', error);
      throw error;
    }
  }
}

export const arvanDriveService = new ArvanDriveService();