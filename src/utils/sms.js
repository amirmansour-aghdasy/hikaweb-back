import axios from 'axios';
import { config } from '../config/environment.js';
import { logger } from './logger.js';

class SMSService {
  constructor() {
    this.baseURL = 'https://api.kavenegar.com/v1';
    this.apiKey = config.KAVENEGAR_API_KEY;
    this.sender = config.KAVENEGAR_SENDER;
  }

  async sendOTP(mobile, otp) {
    try {
      const url = `${this.baseURL}/${this.apiKey}/verify/lookup.json`;
      const response = await axios.post(url, {
        receptor: mobile,
        token: otp,
        template: 'verify'
      });
      logger.info(`OTP sent to ${mobile}`);
      return response.data;
    } catch (error) {
      logger.error('SMS sending failed:', error);
      throw new Error('Failed to send SMS');
    }
  }

  async sendNotification(mobile, message) {
    try {
      const url = `${this.baseURL}/${this.apiKey}/sms/send.json`;
      const response = await axios.post(url, {
        receptor: mobile,
        sender: this.sender,
        message: message
      });
      return response.data;
    } catch (error) {
      logger.error('SMS notification failed:', error);
      throw error;
    }
  }
}

export const smsService = new SMSService();