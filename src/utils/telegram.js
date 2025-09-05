import { config } from '../config/environment.js';
import { logger } from './logger.js';

class TelegramService {
  constructor() {
    this.botToken = config.TELEGRAM_BOT_TOKEN;
    this.adminChatIds = config.TELEGRAM_ADMIN_CHAT_IDS?.split(',') || [];
    this.isEnabled = !!this.botToken;
    
    if (!this.isEnabled) {
      logger.warn('Telegram bot token not configured');
    }
  }

  async sendMessage(chatId, message, options = {}) {
    if (!this.isEnabled) {
      logger.warn('Telegram service disabled - no bot token');
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
          ...options
        })
      });

      const result = await response.json();
      
      if (!result.ok) {
        logger.error('Telegram API error:', result);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Telegram send error:', error);
      return false;
    }
  }

  async sendToAdmins(message, options = {}) {
    if (!this.isEnabled || this.adminChatIds.length === 0) {
      logger.warn('Telegram admins not configured');
      return false;
    }

    const promises = this.adminChatIds.map(chatId => 
      this.sendMessage(chatId.trim(), message, options)
    );

    try {
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
      
      logger.info(`Telegram message sent to ${successful}/${this.adminChatIds.length} admins`);
      return successful > 0;
    } catch (error) {
      logger.error('Telegram broadcast error:', error);
      return false;
    }
  }

  async sendSystemAlert(message, type = 'info') {
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      critical: '🚨'
    };

    const formattedMessage = `
${emoji[type] || emoji.info} <b>سیستم هیکاوب</b>

${message}

🕐 ${new Date().toLocaleString('fa-IR')}
    `.trim();

    return await this.sendToAdmins(formattedMessage);
  }

  async sendErrorNotification(errorData) {
    if (!this.isEnabled) {
      return false;
    }

    const message = `
🚨 <b>خطای سیستم</b>

<b>خطا:</b> ${errorData.error}
<b>مسیر:</b> ${errorData.url}
<b>متد:</b> ${errorData.method}
<b>کاربر:</b> ${errorData.user}
<b>زمان:</b> ${errorData.timestamp}

${errorData.stack ? `<b>Stack:</b>\n<code>${errorData.stack.substring(0, 500)}...</code>` : ''}
    `.trim();

    return await this.sendToAdmins(message);
  }

  async sendUserNotification(userId, message) {
    // Implementation for sending to specific user
    return await this.sendMessage(userId, message);
  }

  async sendAuditLog(logData) {
    if (!this.isEnabled) {
      return false;
    }

    const message = `
📋 <b>لاگ عملیات</b>

<b>عملیات:</b> ${logData.action}
<b>کاربر:</b> ${logData.user}
<b>منبع:</b> ${logData.resource}
<b>جزئیات:</b> ${logData.details || '-'}
<b>زمان:</b> ${new Date().toLocaleString('fa-IR')}
    `.trim();

    return await this.sendToAdmins(message);
  }
}

// Export singleton instance
export const telegramService = new TelegramService();