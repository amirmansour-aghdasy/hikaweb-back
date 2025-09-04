import { Consultation } from './model.js';
import { Service } from '../services/model.js';
import { User } from '../auth/model.js';
import { smsService } from '../../utils/sms.js';
import { telegramService } from '../../utils/telegram.js';
import { logger } from '../../utils/logger.js';

export class ConsultationService {
  static async createConsultation(consultationData) {
    try {
      // Validate services exist
      if (consultationData.services && consultationData.services.length > 0) {
        const servicesCount = await Service.countDocuments({
          _id: { $in: consultationData.services },
          deletedAt: null
        });

        if (servicesCount !== consultationData.services.length) {
          throw new Error('برخی از خدمات انتخابی نامعتبر هستند');
        }
      }

      const consultation = new Consultation(consultationData);
      await consultation.save();
      await consultation.populate('services', 'name');

      // Send notifications to admins
      await this.notifyNewConsultation(consultation);

      logger.info(`Consultation request created: ${consultation.fullName}`);
      return consultation;
    } catch (error) {
      logger.error('Consultation creation error:', error);
      throw error;
    }
  }

  static async updateConsultation(consultationId, updateData, userId) {
    try {
      const consultation = await Consultation.findById(consultationId);

      if (!consultation) {
        throw new Error('درخواست مشاوره یافت نشد');
      }

      Object.assign(consultation, updateData);
      consultation.updatedBy = userId;

      await consultation.save();
      await consultation.populate(['services', 'assignedTo']);

      logger.info(`Consultation updated: ${consultation._id} by user ${userId}`);
      return consultation;
    } catch (error) {
      logger.error('Consultation update error:', error);
      throw error;
    }
  }

  static async getConsultations(filters = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        requestStatus = '',
        assignedTo = '',
        leadSource = '',
        dateFrom = '',
        dateTo = ''
      } = filters;

      let query = { deletedAt: null };

      if (search) {
        query.$or = [
          { fullName: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
          { mobile: new RegExp(search, 'i') },
          { 'company.name': new RegExp(search, 'i') }
        ];
      }

      if (requestStatus) query.requestStatus = requestStatus;
      if (assignedTo) query.assignedTo = assignedTo;
      if (leadSource) query.leadSource = leadSource;

      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      const skip = (page - 1) * limit;

      const [consultations, total] = await Promise.all([
        Consultation.find(query)
          .populate('services', 'name')
          .populate('assignedTo', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Consultation.countDocuments(query)
      ]);

      return {
        data: consultations,
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
      logger.error('Get consultations error:', error);
      throw error;
    }
  }

  static async assignConsultation(consultationId, assignedToId, userId) {
    try {
      const consultation = await Consultation.findById(consultationId);

      if (!consultation) {
        throw new Error('درخواست مشاوره یافت نشد');
      }

      // Verify assignee exists
      const assignee = await User.findById(assignedToId);
      if (!assignee) {
        throw new Error('کاربر برای واگذاری یافت نشد');
      }

      consultation.assignedTo = assignedToId;
      consultation.requestStatus = 'contacted';
      consultation.updatedBy = userId;

      await consultation.save();
      await consultation.populate(['services', 'assignedTo']);

      // Send notification to assigned user
      await this.notifyConsultationAssignment(consultation);

      logger.info(`Consultation assigned: ${consultation._id} to ${assignee.email}`);
      return consultation;
    } catch (error) {
      logger.error('Consultation assignment error:', error);
      throw error;
    }
  }

  static async notifyNewConsultation(consultation) {
    try {
      const services = consultation.services.map(s => s.name.fa).join('، ');

      const message = `🤝 درخواست مشاوره جدید

نام: ${consultation.fullName}
ایمیل: ${consultation.email}
موبایل: ${consultation.mobile}
خدمات: ${services}
بودجه: ${consultation.budget}
زمان‌بندی: ${consultation.timeline}`;

      // Send Telegram notification
      await telegramService.sendSystemAlert(message, 'info');

      // Send SMS to admin numbers
      const adminUsers = await User.find({
        $or: [{ 'role.permissions': 'consultations.read' }, { 'role.permissions': 'admin.all' }]
      }).populate('role');

      const adminMobiles = adminUsers.filter(user => user.mobile).map(user => user.mobile);

      if (adminMobiles.length > 0) {
        const smsMessage = `درخواست مشاوره جدید از ${consultation.fullName}. لطفاً وارد پنل شوید.`;
        await smsService.sendBulk(adminMobiles, smsMessage);
      }
    } catch (error) {
      logger.error('New consultation notification error:', error);
    }
  }

  static async notifyConsultationAssignment(consultation) {
    try {
      if (consultation.assignedTo?.mobile) {
        const message = `درخواست مشاوره ${consultation.fullName} به شما واگذار شد. لطفاً پیگیری کنید.`;
        await smsService.sendNotification(consultation.assignedTo.mobile, message);
      }
    } catch (error) {
      logger.error('Assignment notification error:', error);
    }
  }
}
