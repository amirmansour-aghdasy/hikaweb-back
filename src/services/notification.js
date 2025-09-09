import { baleService } from '../utils/bale.js';
import { smsService } from '../utils/sms.js';
import { logger } from '../utils/logger.js';
import { User } from '../modules/auth/model.js';

export class NotificationService {
  static async notifyUser(userId, type, data) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const notifications = [];

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

  static async notifyModerators(type, data) {
    try {
      // Send to Bale instead of Telegram
      await baleService.sendToAdmins(`
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

export const notificationService = NotificationService;
