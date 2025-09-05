import { telegramService } from '../utils/telegram.js';
import { smsService } from '../utils/sms.js';
import { logger } from '../utils/logger.js';
import { User } from '../modules/auth/model.js';

/**
 * Notification Service
 * Handles all types of notifications (Telegram, SMS, Email)
 */
export class NotificationService {
  /**
   * Send notification to user
   */
  static async notifyUser(userId, type, data) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const notifications = [];

      // Send based on user preferences
      if (user.preferences?.notifications?.email !== false) {
        notifications.push(this.sendEmailNotification(user.email, type, data));
      }

      if (user.preferences?.notifications?.sms !== false && user.phone) {
        notifications.push(this.sendSMSNotification(user.phone, type, data));
      }

      await Promise.allSettled(notifications);
      logger.info('User notifications sent:', { userId, type });

      return true;
    } catch (error) {
      logger.error('Error sending user notification:', error);
      return false;
    }
  }

  /**
   * Send notification to moderators/admins
   */
  static async notifyModerators(type, data) {
    try {
      // Send to Telegram
      await telegramService.sendToAdmins(`
🔔 **${this.getNotificationTitle(type)}**

${this.formatNotificationData(type, data)}

⏰ ${new Date().toLocaleString('fa-IR')}
      `);

      logger.info('Moderator notification sent:', { type });
      return true;
    } catch (error) {
      logger.error('Error sending moderator notification:', error);
      return false;
    }
  }

  /**
   * Send SMS notification
   */
  static async sendSMSNotification(phone, type, data) {
    try {
      const message = this.getSMSMessage(type, data);
      await smsService.send(phone, message);

      logger.info('SMS notification sent:', { phone, type });
      return true;
    } catch (error) {
      logger.error('Error sending SMS notification:', error);
      return false;
    }
  }

  /**
   * Get notification title based on type
   */
  static getNotificationTitle(type) {
    const titles = {
      comment_created: 'نظر جدید ثبت شد',
      comment_moderated: 'نظر تایید/رد شد',
      consultation_request: 'درخواست مشاوره جدید',
      ticket_created: 'تیکت جدید ایجاد شد',
      ticket_updated: 'تیکت به‌روزرسانی شد',
      user_registered: 'کاربر جدید ثبت‌نام کرد',
      password_reset: 'درخواست بازیابی رمز عبور',
      login_attempt: 'تلاش ورود مشکوک'
    };

    return titles[type] || 'اعلان سیستم';
  }

  /**
   * Format notification data
   */
  static formatNotificationData(type, data) {
    switch (type) {
      case 'comment_created':
        return `نظر: ${data.content}\nنوع: ${data.referenceType}`;

      case 'consultation_request':
        return `نام: ${data.name}\nخدمت: ${data.service}\nتلفن: ${data.phone}`;

      case 'ticket_created':
        return `موضوع: ${data.subject}\nاولویت: ${data.priority}`;

      case 'user_registered':
        return `ایمیل: ${data.email}\nنام: ${data.firstName} ${data.lastName}`;

      default:
        return JSON.stringify(data, null, 2);
    }
  }

  /**
   * Get SMS message content
   */
  static getSMSMessage(type, data) {
    const messages = {
      comment_moderated: `نظر شما ${data.status === 'approved' ? 'تایید' : 'رد'} شد.`,
      consultation_confirmation: 'درخواست مشاوره شما ثبت شد. به زودی تماس خواهیم گرفت.',
      ticket_response: 'پاسخ جدیدی به تیکت شما ارسال شد.',
      password_reset: `کد بازیابی: ${data.code}`,
      otp_verification: `کد تایید: ${data.code}`
    };

    return messages[type] || 'اعلان از هیکاوب';
  }

  /**
   * Get email content
   */
  static getEmailContent(type, data) {
    const contents = {
      comment_moderated: {
        subject: 'وضعیت نظر شما',
        html: `<p>نظر شما ${data.status === 'approved' ? 'تایید' : 'رد'} شد.</p>`
      },
      consultation_confirmation: {
        subject: 'تایید درخواست مشاوره',
        html: '<p>درخواست مشاوره شما ثبت شد. کارشناسان ما به زودی با شما تماس خواهند گرفت.</p>'
      },
      password_reset: {
        subject: 'بازیابی رمز عبور',
        html: `<p>برای بازیابی رمز عبور روی لینک زیر کلیک کنید:</p><a href="${data.resetLink}">بازیابی رمز عبور</a>`
      }
    };

    return (
      contents[type] || {
        subject: 'اعلان هیکاوب',
        html: '<p>اعلان جدید از سیستم هیکاوب</p>'
      }
    );
  }

  /**
   * Send bulk notifications
   */
  static async sendBulkNotification(userIds, type, data) {
    try {
      const notifications = userIds.map(userId => this.notifyUser(userId, type, data));

      await Promise.allSettled(notifications);
      logger.info('Bulk notifications sent:', { count: userIds.length, type });

      return true;
    } catch (error) {
      logger.error('Error sending bulk notifications:', error);
      return false;
    }
  }
}

// Export instance for convenience
export const notificationService = NotificationService;
