import Redis from 'redis';
import { config } from './environment.js';
import { logger } from '../utils/logger.js';

class RedisClient {
  constructor() {
    this.client = null;
  }

  async connect() {
    try {
      this.client = Redis.createClient({ url: config.REDIS_URL });
      this.client.on('error', err => logger.error('Redis error:', err));
      await this.client.connect();
      logger.info('Redis connected successfully');
      return this.client;
    } catch (error) {
      logger.error('Redis connection failed:', error);
      throw error;
    }
  }

  getClient() {
    return this.client;
  }
}

export const redisClient = new RedisClient();