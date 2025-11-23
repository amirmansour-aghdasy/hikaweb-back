import nodemailer from 'nodemailer';
import { config } from '../config/environment.js';
import { logger } from './logger.js';

class EmailService {
  constructor() {
    // Create transporter - in production, configure with actual SMTP settings
    // For now, using a simple console logger for development
    this.transporter = null;
    
    // Try to create transporter if SMTP config exists
    if (config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT || 587,
        secure: config.SMTP_SECURE === 'true' || false,
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASSWORD
        }
      });
    }
  }

  async sendOTP(email, otp) {
    try {
      const mailOptions = {
        from: config.SMTP_FROM || config.SMTP_USER || 'noreply@hikaweb.com',
        to: email,
        subject: 'کد تایید ورود به پنل مدیریت',
        html: `
          <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; text-align: center; margin-bottom: 30px;">کد تایید ورود</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                سلام،
              </p>
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                کد تایید شما برای ورود به پنل مدیریت:
              </p>
              <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 5px; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #1976d2; letter-spacing: 5px;">${otp}</span>
              </div>
              <p style="color: #999; font-size: 14px; line-height: 1.6; margin-top: 20px;">
                این کد تا ۵ دقیقه معتبر است.
              </p>
              <p style="color: #999; font-size: 14px; line-height: 1.6; margin-top: 10px;">
                اگر شما این درخواست را انجام نداده‌اید، لطفاً این ایمیل را نادیده بگیرید.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">
                آژانس دیجیتال مارکتینگ هیکاوب
              </p>
            </div>
          </div>
        `
      };

      if (this.transporter) {
        await this.transporter.sendMail(mailOptions);
        logger.info(`OTP email sent to ${email}`);
      } else {
        // In development, log the OTP instead of sending
        logger.info(`[DEV] OTP email would be sent to ${email}: ${otp}`);
        logger.warn('SMTP not configured. Email not sent. Please configure SMTP settings in environment variables.');
      }

      return true;
    } catch (error) {
      logger.error('Email sending failed:', error);
      throw new Error('خطا در ارسال ایمیل');
    }
  }
}

export const emailService = new EmailService();

