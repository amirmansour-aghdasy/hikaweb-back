import { redisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';

/**
 * Cache Service
 * Wrapper around Redis for caching operations
 */
export class CacheService {
  /**
   * Get the Redis client instance
   */
  static getClient() {
    const client = redisClient.getClient();
    if (!client) {
      throw new Error('Redis client is not connected');
    }
    return client;
  }

  /**
   * Get value from cache
   */
  static async get(key) {
    try {
      const client = this.getClient();
      const value = await client.get(key);
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
      const client = this.getClient();
      await client.setEx(key, ttl, JSON.stringify(value));
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
      const client = this.getClient();
      await client.del(key);
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
      const client = this.getClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
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
      const client = this.getClient();
      return await client.exists(key);
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
      const client = this.getClient();
      await client.flushAll();
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
      const client = this.getClient();
      const info = await client.info('memory');
      return {
        memory: info,
        keyCount: await client.dbSize()
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return null;
    }
  }
}

// Export instance for convenience
export const cacheService = CacheService;
