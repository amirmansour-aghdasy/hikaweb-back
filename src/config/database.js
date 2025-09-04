import mongoose from 'mongoose';
import { config } from './environment.js';
import { logger } from '../utils/logger.js';

export class Database {
  static async connect() {
    try {
      await mongoose.connect(config.MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
      });
      logger.info('MongoDB connected successfully');
    } catch (error) {
      logger.error('MongoDB connection failed:', error);
      process.exit(1);
    }
  }

  static async disconnect() {
    await mongoose.connection.close();
    logger.info('MongoDB disconnected');
  }
}