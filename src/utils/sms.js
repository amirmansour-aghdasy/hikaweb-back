import axios from 'axios';
import { config } from '../config/environment.js';
import { logger } from './logger.js';

class SMSService {
  constructor() {
    this.baseURL = 'https://api.kavenegar.com/v1';
    this.apiKey = config.KAVENEGAR_API_KEY;
    this.sender = config.KAVENEGAR_SENDER;
  }

  async sendOTP(phoneNumber, otp) {
    try {
      const url = `${this.baseURL}/${this.apiKey}/verify/lookup.json?receptor=${phoneNumber}&token=${otp}&template=verify`;
      const response = await axios.post(url);
      logger.info(`OTP sent to ${phoneNumber}`);
      return response.data;
    } catch (error) {
      logger.error('SMS sending failed:', error);
      throw new Error('Failed to send SMS');
    }
  }

  async sendNotification(phoneNumber, message) {
    try {
      const url = `${this.baseURL}/${this.apiKey}/sms/send.json`;
      const response = await axios.post(url, {
        receptor: phoneNumber,
        sender: this.sender,
        message: message
      });
      return response.data;
    } catch (error) {
      logger.error('SMS notification failed:', error);
      throw error;
    }
  }

  async sendBulk(phoneNumbers, message) {
    try {
      if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
        return;
      }

      if (!this.sender) {
        logger.warn('KAVENEGAR_SENDER is not configured. Skipping bulk SMS.');
        return;
      }

      // Kavenegar sendarray requires arrays as JSON strings in query parameters
      // Each array must have the same length
      // Create arrays: each phone number gets the same sender and message
      const receptors = phoneNumbers;
      const senders = phoneNumbers.map(() => this.sender);
      const messages = phoneNumbers.map(() => message);
      
      // Convert arrays to JSON strings for query parameters
      const receptorParam = encodeURIComponent(JSON.stringify(receptors));
      const senderParam = encodeURIComponent(JSON.stringify(senders));
      const messageParam = encodeURIComponent(JSON.stringify(messages));
      
      const url = `${this.baseURL}/${this.apiKey}/sms/sendarray.json?receptor=${receptorParam}&sender=${senderParam}&message=${messageParam}`;
      
      const response = await axios.post(url);
      
      logger.info(`Bulk SMS sent to ${phoneNumbers.length} recipients`);
      return response.data;
    } catch (error) {
      logger.error('Bulk SMS sending failed:', error);
      throw error;
    }
  }
}

export const smsService = new SMSService();
