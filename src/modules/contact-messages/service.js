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

      // Notify all admin users about new contact message
      try {
        // Find admin and super_admin roles
        const adminRoles = await Role.find({
          name: { $in: ['admin', 'super_admin'] },
          deletedAt: null
        }).select('_id').lean();

        const adminRoleIds = adminRoles.map(role => role._id);

        // Find all users with admin roles
        const adminUsers = await User.find({
          role: { $in: adminRoleIds },
          deletedAt: null
        }).select('_id').lean();

        const adminUserIds = adminUsers.map(user => user._id);

        if (adminUserIds.length > 0) {
          await Notification.insertMany(
            adminUserIds.map(adminId => ({
              type: 'other',
              title: {
                fa: 'پیام تماس با ما جدید',
                en: 'New Contact Message'
              },
              message: {
                fa: `پیام جدید از ${contactMessage.fullName} (${contactMessage.email})`,
                en: `New message from ${contactMessage.fullName} (${contactMessage.email})`
              },
              recipient: adminId,
              relatedEntity: {
                type: 'other',
                id: contactMessage._id
              },
              priority: 'normal',
              actionUrl: `/dashboard/contact-messages`
            }))
          );
          logger.info(`Notifications sent to ${adminUserIds.length} admin users for contact message: ${contactMessage._id}`);
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

