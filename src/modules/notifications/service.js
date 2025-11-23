import { Notification } from './model.js';
import { User } from '../auth/model.js';
import { logger } from '../../utils/logger.js';

export class NotificationService {
  /**
   * Create a notification
   */
  static async createNotification(data) {
    try {
      const notification = new Notification(data);
      await notification.save();
      
      logger.info('Notification created:', { id: notification._id, type: data.type });
      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(userId, options = {}) {
    try {
      const {
        limit = 25,
        page = 1,
        isRead = null,
        type = null,
        search = null
      } = options;

      const query = { recipient: userId, deletedAt: null };
      
      if (isRead !== null) {
        query.isRead = isRead;
      }
      
      if (type) {
        query.type = type;
      }

      if (search) {
        query.$or = [
          { 'title.fa': { $regex: search, $options: 'i' } },
          { 'title.en': { $regex: search, $options: 'i' } },
          { 'message.fa': { $regex: search, $options: 'i' } },
          { 'message.en': { $regex: search, $options: 'i' } },
          { type: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        Notification.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Notification.countDocuments(query)
      ]);

      return {
        data: notifications,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { isRead: true, readAt: new Date() },
        { new: true }
      );

      if (!notification) {
        throw new Error('Notification not found or unauthorized');
      }

      return notification;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { recipient: userId, isRead: false, deletedAt: null },
        { isRead: true, readAt: new Date() }
      );

      return result;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
        deletedAt: null
      });

      return count;
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { deletedAt: new Date() },
        { new: true }
      );

      if (!notification) {
        throw new Error('Notification not found or unauthorized');
      }

      return notification;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Create notification for multiple users (broadcast)
   */
  static async broadcastNotification(userIds, notificationData) {
    try {
      const notifications = userIds.map(userId => ({
        ...notificationData,
        recipient: userId
      }));

      await Notification.insertMany(notifications);
      
      logger.info('Notifications broadcasted:', { count: notifications.length, type: notificationData.type });
      return true;
    } catch (error) {
      logger.error('Error broadcasting notifications:', error);
      throw error;
    }
  }
}

