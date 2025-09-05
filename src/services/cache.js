import { redisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';

/**
 * Cache Service
 * Wrapper around Redis for caching operations
 */
export class CacheService {
  /**
   * Get value from cache
   */
  static async get(key) {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  static async set(key, value, ttl = 3600) {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete specific key
   */
  static async delete(key) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete keys matching pattern
   */
  static async deletePattern(pattern) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (error) {
      logger.error('Cache delete pattern error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  static async exists(key) {
    try {
      return await redisClient.exists(key);
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  static async clear() {
    try {
      await redisClient.flushAll();
      return true;
    } catch (error) {
      logger.error('Cache clear error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats() {
    try {
      const info = await redisClient.info('memory');
      return {
        memory: info,
        keyCount: await redisClient.dbSize()
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return null;
    }
  }
}

// Export instance for convenience
export const cacheService = CacheService;
