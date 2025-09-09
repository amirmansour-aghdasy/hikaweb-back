import { Ticket } from './model.js';
import { User } from '../auth/model.js';
import { smsService } from '../../utils/sms.js';
import { baleService } from '../../utils/bale.js';
import { logger } from '../../utils/logger.js';

export class TicketService {
  static async createTicket(ticketData, userId) {
    try {
      const ticket = new Ticket({
        ...ticketData,
        customer: userId,
        createdBy: userId
      });

      await ticket.save();
      await ticket.populate(['customer', 'category']);

      // Notify admins about new ticket
      await this.notifyNewTicket(ticket);

      logger.info(`Ticket created: ${ticket.ticketNumber} by user ${userId}`);
      return ticket;
    } catch (error) {
      logger.error('Ticket creation error:', error);
      throw error;
    }
  }

  static async updateTicket(ticketId, updateData, userId) {
    try {
      const ticket = await Ticket.findById(ticketId);

      if (!ticket) {
        throw new Error('تیکت یافت نشد');
      }

      // Check permissions
      const user = await User.findById(userId).populate('role');
      const isCustomer = ticket.customer.toString() === userId;
      const hasAdminAccess =
        user.role.permissions.includes('tickets.update') ||
        user.role.permissions.includes('admin.all');

      if (!isCustomer && !hasAdminAccess) {
        throw new Error('شما مجاز به ویرایش این تیکت نیستید');
      }

      // Customers can only update certain fields
      if (isCustomer) {
        const allowedFields = ['subject', 'description', 'priority'];
        const updates = {};

        allowedFields.forEach(field => {
          if (updateData[field]) {
            updates[field] = updateData[field];
          }
        });

        updateData = updates;
      }

      Object.assign(ticket, updateData);
      ticket.updatedBy = userId;

      await ticket.save();
      await ticket.populate(['customer', 'assignedTo', 'category']);

      logger.info(`Ticket updated: ${ticket.ticketNumber} by user ${userId}`);
      return ticket;
    } catch (error) {
      logger.error('Ticket update error:', error);
      throw error;
    }
  }

  static async addMessage(ticketId, messageData, userId) {
    try {
      const ticket = await Ticket.findById(ticketId).populate('customer');

      if (!ticket) {
        throw new Error('تیکت یافت نشد');
      }

      // Check access permissions
      const user = await User.findById(userId).populate('role');
      const isCustomer = ticket.customer._id.toString() === userId;
      const hasAdminAccess =
        user.role.permissions.includes('tickets.read') ||
        user.role.permissions.includes('admin.all');

      if (!isCustomer && !hasAdminAccess) {
        throw new Error('شما مجاز به پاسخ دادن در این تیکت نیستید');
      }

      // Customers cannot send internal messages
      if (isCustomer && messageData.isInternal) {
        messageData.isInternal = false;
      }

      const message = {
        ...messageData,
        author: userId
      };

      await ticket.addMessage(message);

      // Update ticket status
      if (ticket.ticketStatus === 'waiting_response' && !isCustomer) {
        ticket.ticketStatus = 'in_progress';
      } else if (isCustomer && ticket.ticketStatus === 'in_progress') {
        ticket.ticketStatus = 'waiting_response';
      }

      await ticket.save();

      // Send notifications
      await this.notifyNewMessage(ticket, message, isCustomer);

      logger.info(`Message added to ticket: ${ticket.ticketNumber} by user ${userId}`);
      return ticket;
    } catch (error) {
      logger.error('Add ticket message error:', error);
      throw error;
    }
  }

  static async assignTicket(ticketId, assignedToId, userId) {
    try {
      const ticket = await Ticket.findById(ticketId);

      if (!ticket) {
        throw new Error('تیکت یافت نشد');
      }

      // Verify assignee exists and has permission
      const assignee = await User.findById(assignedToId).populate('role');
      if (!assignee) {
        throw new Error('کاربر برای واگذاری یافت نشد');
      }

      const hasTicketAccess =
        assignee.role.permissions.includes('tickets.read') ||
        assignee.role.permissions.includes('admin.all');

      if (!hasTicketAccess) {
        throw new Error('کاربر انتخابی مجوز دسترسی به تیکت‌ها ندارد');
      }

      ticket.assignedTo = assignedToId;
      ticket.ticketStatus = 'in_progress';
      ticket.updatedBy = userId;

      await ticket.save();
      await ticket.populate(['customer', 'assignedTo']);

      // Notify assigned user
      await this.notifyTicketAssignment(ticket);

      logger.info(`Ticket assigned: ${ticket.ticketNumber} to ${assignee.email}`);
      return ticket;
    } catch (error) {
      logger.error('Ticket assignment error:', error);
      throw error;
    }
  }

  static async closeTicket(ticketId, resolutionData, userId) {
    try {
      const ticket = await Ticket.findById(ticketId);

      if (!ticket) {
        throw new Error('تیکت یافت نشد');
      }

      const resolvedBy = await User.findById(userId);

      await ticket.close({
        ...resolutionData,
        resolvedBy: userId
      });

      await ticket.populate(['customer', 'assignedTo']);

      // Notify customer about resolution
      await this.notifyTicketResolution(ticket);

      logger.info(`Ticket closed: ${ticket.ticketNumber} by ${resolvedBy.email}`);
      return ticket;
    } catch (error) {
      logger.error('Ticket closure error:', error);
      throw error;
    }
  }

  static async getTickets(filters = {}, userId, userRole) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        department = '',
        priority = '',
        ticketStatus = '',
        assignedTo = '',
        customer = ''
      } = filters;

      let query = { deletedAt: null };

      // Role-based filtering
      const hasAdminAccess =
        userRole.permissions.includes('tickets.read') || userRole.permissions.includes('admin.all');

      if (!hasAdminAccess) {
        // Regular users can only see their own tickets
        query.customer = userId;
      }

      // Apply filters
      if (search) {
        query.$or = [
          { ticketNumber: new RegExp(search, 'i') },
          { subject: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') }
        ];
      }

      if (department) query.department = department;
      if (priority) query.priority = priority;
      if (ticketStatus) query.ticketStatus = ticketStatus;
      if (assignedTo) query.assignedTo = assignedTo;
      if (customer && hasAdminAccess) query.customer = customer;

      const skip = (page - 1) * limit;

      const [tickets, total] = await Promise.all([
        Ticket.find(query)
          .populate('customer', 'name email')
          .populate('assignedTo', 'name email')
          .populate('category', 'name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Ticket.countDocuments(query)
      ]);

      return {
        data: tickets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Get tickets error:', error);
      throw error;
    }
  }

  static async notifyNewTicket(ticket) {
    try {
      // Get admin users for notification
      const adminUsers = await User.find({
        $or: [{ 'role.permissions': 'tickets.read' }, { 'role.permissions': 'admin.all' }]
      }).populate('role');

      const message = `🎫 تیکت جدید دریافت شد

شماره تیکت: ${ticket.ticketNumber}
موضوع: ${ticket.subject}
مشتری: ${ticket.customer.name}
بخش: ${ticket.department}
اولویت: ${ticket.priority}`;

      // Send Telegram notification
      await baleService.sendSystemAlert(message, 'info');

      // Send SMS to admin numbers (if configured)
      const adminMobiles = adminUsers.filter(user => user.mobile).map(user => user.mobile);

      if (adminMobiles.length > 0) {
        const smsMessage = `تیکت جدید ${ticket.ticketNumber} از ${ticket.customer.name}`;
        await smsService.sendBulk(adminMobiles, smsMessage);
      }
    } catch (error) {
      logger.error('New ticket notification error:', error);
    }
  }

  static async notifyNewMessage(ticket, message, isCustomer) {
    try {
      const notification = `💬 پیام جدید در تیکت ${ticket.ticketNumber}

${isCustomer ? 'از طرف مشتری' : 'از طرف پشتیبانی'}
محتوا: ${message.content.substring(0, 100)}...`;

      await baleService.sendSystemAlert(notification, 'info');

      // SMS notification to customer or assigned user
      let targetMobile = null;

      if (isCustomer && ticket.assignedTo?.mobile) {
        targetMobile = ticket.assignedTo.mobile;
      } else if (!isCustomer && ticket.customer.mobile) {
        targetMobile = ticket.customer.mobile;
      }

      if (targetMobile) {
        const smsMessage = `پیام جدید در تیکت ${ticket.ticketNumber}. لطفاً وارد پنل شوید.`;
        await smsService.sendNotification(targetMobile, smsMessage);
      }
    } catch (error) {
      logger.error('Message notification error:', error);
    }
  }

  static async notifyTicketAssignment(ticket) {
    try {
      if (ticket.assignedTo?.mobile) {
        const message = `تیکت ${ticket.ticketNumber} به شما واگذار شد. موضوع: ${ticket.subject}`;
        await smsService.sendNotification(ticket.assignedTo.mobile, message);
      }

      const telegramMessage = `📋 تیکت واگذار شد

تیکت: ${ticket.ticketNumber}
واگذار شده به: ${ticket.assignedTo.name}
موضوع: ${ticket.subject}`;

      await baleService.sendSystemAlert(telegramMessage, 'info');
    } catch (error) {
      logger.error('Assignment notification error:', error);
    }
  }

  static async notifyTicketResolution(ticket) {
    try {
      if (ticket.customer.mobile) {
        const message = `تیکت ${ticket.ticketNumber} حل شد. از همکاری شما متشکریم.`;
        await smsService.sendNotification(ticket.customer.mobile, message);
      }

      const telegramMessage = `✅ تیکت حل شد

تیکت: ${ticket.ticketNumber}
مشتری: ${ticket.customer.name}
زمان حل: ${ticket.resolution.resolutionTime} دقیقه`;

      await baleService.sendSystemAlert(telegramMessage, 'info');
    } catch (error) {
      logger.error('Resolution notification error:', error);
    }
  }
}
