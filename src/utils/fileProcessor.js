import sharp from 'sharp';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger.js';

export class FileProcessor {
  static async processImage(buffer, options = {}) {
    try {
      const sizes = {
        thumbnail: { width: 150, height: 150 },
        small: { width: 300, height: 300 },
        medium: { width: 768, height: 768 },
        large: { width: 1200, height: 1200 }
      };

      const variants = {};
      const metadata = await sharp(buffer).metadata();

      for (const [sizeName, dimensions] of Object.entries(sizes)) {
        const processed = await sharp(buffer)
          .resize(dimensions.width, dimensions.height, { fit: 'inside', withoutEnlargement: true })
          .toFormat('webp', { quality: 85 })
          .toBuffer();

        variants[sizeName] = {
          buffer: processed,
          width: dimensions.width,
          height: dimensions.height,
          size: processed.length
        };
      }

      return { variants, originalMetadata: metadata };
    } catch (error) {
      logger.error('Image processing failed:', error);
      throw error;
    }
  }

  static generateUniqueFilename(originalName) {
    const ext = path.extname(originalName);
    return `${Date.now()}-${uuidv4()}${ext}`;
  }

  static getFileTypeCategory(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document')) return 'document';
    return 'other';
  }
}