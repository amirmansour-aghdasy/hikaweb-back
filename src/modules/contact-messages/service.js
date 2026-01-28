import { ContactMessage } from './model.js';
import { User } from '../auth/model.js';
import { Role } from '../users/roleModel.js';
import { Notification } from '../notifications/model.js';
import { logger } from '../../utils/logger.js';

export class ContactMessageService {
  static async createContactMessage(data, userId = null) {
    try {
      const messageData = {
        ...data,
        user: userId || null
      };

      const contactMessage = new ContactMessage(messageData);
      await contactMessage.save();

      // Notify all users with dashboard access (higher than regular user) about new contact message
      try {
        // Find roles with dashboard access: admin, super_admin, editor, moderator
        const dashboardRoles = await Role.find({
          name: { $in: ['admin', 'super_admin', 'editor', 'moderator'] },
          deletedAt: null
        }).select('_id').lean();

        const dashboardRoleIds = dashboardRoles.map(role => role._id);

        // Find all users with dashboard access roles
        const dashboardUsers = await User.find({
          role: { $in: dashboardRoleIds },
          deletedAt: null
        }).select('_id').lean();

        const dashboardUserIds = dashboardUsers.map(user => user._id);

        if (dashboardUserIds.length > 0) {
          await Notification.insertMany(
            dashboardUserIds.map(userId => ({
              type: 'contact_message_new',
              title: {
                fa: 'پیام تماس با ما جدید',
                en: 'New Contact Message'
              },
              message: {
                fa: `پیام جدید از ${contactMessage.fullName}${contactMessage.email ? ` (${contactMessage.email})` : ''}`,
                en: `New message from ${contactMessage.fullName}${contactMessage.email ? ` (${contactMessage.email})` : ''}`
              },
              recipient: userId,
              relatedEntity: {
                type: 'other',
                id: contactMessage._id
              },
              priority: 'normal',
              actionUrl: `/dashboard/contact-messages`
            }))
          );
          logger.info(`Notifications sent to ${dashboardUserIds.length} dashboard users for contact message: ${contactMessage._id}`);
        }
      } catch (notificationError) {
        // Don't fail the message creation if notification fails
        logger.error('Error sending notifications for contact message:', notificationError);
      }

      logger.info(`Contact message created: ${contactMessage._id}`);
      return contactMessage;
    } catch (error) {
      logger.error('Error creating contact message:', error);
      throw error;
    }
  }

  static async getContactMessages(query = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        status = '',
        sort = '-createdAt'
      } = query;

      const skip = (page - 1) * limit;

      // Build filter
      const filter = {};
      if (status) {
        filter.status = status;
      }

      if (search) {
        filter.$or = [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phoneNumber: { $regex: search, $options: 'i' } },
          { message: { $regex: search, $options: 'i' } }
        ];
      }

      // Parse sort
      const sortObj = {};
      if (sort.startsWith('-')) {
        sortObj[sort.substring(1)] = -1;
      } else {
        sortObj[sort] = 1;
      }

      const [messages, total] = await Promise.all([
        ContactMessage.find(filter)
          .sort(sortObj)
          .skip(skip)
          .limit(limit)
          .populate('user', 'fullName email')
          .lean(),
        ContactMessage.countDocuments(filter)
      ]);

      return {
        data: messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error fetching contact messages:', error);
      throw error;
    }
  }

  static async getContactMessageById(id) {
    try {
      const message = await ContactMessage.findById(id)
        .populate('user', 'fullName email')
        .lean();

      if (!message) {
        const error = new Error('پیام یافت نشد');
        error.statusCode = 404;
        throw error;
      }

      return message;
    } catch (error) {
      logger.error('Error fetching contact message:', error);
      throw error;
    }
  }

  static async updateContactMessage(id, data, userId) {
    try {
      const message = await ContactMessage.findById(id);

      if (!message) {
        const error = new Error('پیام یافت نشد');
        error.statusCode = 404;
        throw error;
      }

      Object.assign(message, data);
      message.updatedBy = userId;
      await message.save();

      logger.info(`Contact message updated: ${id} by user: ${userId}`);
      return message;
    } catch (error) {
      logger.error('Error updating contact message:', error);
      throw error;
    }
  }

  static async markAsRead(id, userId) {
    try {
      const message = await ContactMessage.findById(id);

      if (!message) {
        const error = new Error('پیام یافت نشد');
        error.statusCode = 404;
        throw error;
      }

      await message.markAsRead(userId);
      
      // Delete notification for ALL users when someone marks message as read
      // This is a public notification - when one person reads it, it's removed for everyone
      try {
        await Notification.deleteMany({
          type: 'contact_message_new',
          'relatedEntity.type': 'other',
          'relatedEntity.id': message._id
        });
        logger.info(`Notifications deleted for all users when contact message ${id} was marked as read by user ${userId}`);
      } catch (notificationError) {
        // Don't fail the read operation if notification deletion fails
        logger.error('Error deleting notifications for contact message:', notificationError);
      }
      
      logger.info(`Contact message marked as read: ${id} by user: ${userId}`);
      return message;
    } catch (error) {
      logger.error('Error marking contact message as read:', error);
      throw error;
    }
  }

  // Reply functionality removed - use ticket system instead

  static async deleteContactMessage(id) {
    try {
      const message = await ContactMessage.findByIdAndDelete(id);

      if (!message) {
        const error = new Error('پیام یافت نشد');
        error.statusCode = 404;
        throw error;
      }

      logger.info(`Contact message deleted: ${id}`);
      return message;
    } catch (error) {
      logger.error('Error deleting contact message:', error);
      throw error;
    }
  }

  static async getStats() {
    try {
      const [total, newCount, readCount, archivedCount] = await Promise.all([
        ContactMessage.countDocuments(),
        ContactMessage.countDocuments({ status: 'new' }),
        ContactMessage.countDocuments({ status: 'read' }),
        ContactMessage.countDocuments({ status: 'archived' })
      ]);

      return {
        total,
        new: newCount,
        read: readCount,
        archived: archivedCount
      };
    } catch (error) {
      logger.error('Error fetching contact message stats:', error);
      throw error;
    }
  }
}

