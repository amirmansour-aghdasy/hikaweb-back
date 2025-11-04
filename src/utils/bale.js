import { config } from '../config/environment.js';
import { logger } from './logger.js';

class BaleService {
  constructor() {
    this.botToken = config.BALE_BOT_TOKEN;
    this.adminChatIds = config.BALE_ADMIN_CHAT_IDS?.split(',') || [];
    this.isEnabled = !!this.botToken;

    if (!this.isEnabled) {
      logger.warn('Bale bot token not configured');
    }
  }

  async sendMessage(chatId, message, options = {}) {
    if (!this.isEnabled) {
      logger.warn('Bale service disabled - no bot token');
      return false;
    }

    try {
      const url = `https://tapi.bale.ai/bot${this.botToken}/sendMessage`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
        logger.error('Bale API error:', result);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Bale send error:', error);
      return false;
    }
  }

  async sendToAdmins(message, options = {}) {
    if (!this.isEnabled || this.adminChatIds.length === 0) {
      logger.warn('Bale admins not configured');
      return false;
    }

    const promises = this.adminChatIds.map(chatId =>
      this.sendMessage(chatId.trim(), message, options)
    );

    try {
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;

      logger.info(`Bale message sent to ${successful}/${this.adminChatIds.length} admins`);
      return successful > 0;
    } catch (error) {
      logger.error('Bale broadcast error:', error);
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
    return await this.sendMessage(userId, message);
  }

  async sendAuditLog(logData) {
    if (!this.isEnabled) {
      return false;
    }

    const emojiMap = {
      'CREATE_USER': '👤',
      'UPDATE_USER': '✏️',
      'DELETE_USER': '🗑️',
      'DELETE': '🗑️',
      'UPDATE_ROLE': '🔐',
      'CREATE_ROLE': '➕',
      'DELETE_ROLE': '🗑️'
    };

    const emoji = emojiMap[logData.action] || '📋';

    const message = `
${emoji} <b>لاگ عملیات</b>

<b>عملیات:</b> ${logData.action}
<b>کاربر:</b> ${logData.user || 'Unknown'}
<b>منبع:</b> ${logData.resource || 'N/A'}
<b>جزئیات:</b> ${logData.details || '-'}
<b>زمان:</b> ${logData.timestamp || new Date().toLocaleString('fa-IR')}
    `.trim();

    return await this.sendToAdmins(message);
  }
}

// Export singleton instance
export const baleService = new BaleService();
