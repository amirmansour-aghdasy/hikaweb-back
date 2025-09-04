import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config/environment.js';
import { logger } from './logger.js';

class TelegramService {
  constructor() {
    if (config.TELEGRAM_BOT_TOKEN) {
      this.bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: false });
    }
  }

  async sendAuditNotification(auditData, recipients = []) {
    if (!this.bot) return;

    try {
      const message = this.formatAuditMessage(auditData);
      const chatIds = recipients.length > 0 ? recipients : [config.TELEGRAM_CHAT_ID];

      for (const chatId of chatIds) {
        if (chatId) {
          await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
        }
      }
    } catch (error) {
      logger.error('Telegram notification failed:', error);
    }
  }

  formatAuditMessage(auditData) {
    const { action, resource, user, timestamp, ip } = auditData;
    return `
🔍 <b>هیکاوب - گزارش عملیات</b>

<b>عملیات:</b> ${action}
<b>منبع:</b> ${resource}
<b>کاربر:</b> ${user?.name || 'سیستم'}
<b>زمان:</b> ${new Date(timestamp).toLocaleString('fa-IR')}
<b>IP:</b> ${ip}
    `.trim();
  }
}

export const telegramService = new TelegramService();