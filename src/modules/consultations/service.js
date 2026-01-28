import { Consultation } from './model.js';
import { Service } from '../services/model.js';
import { Product } from '../products/model.js';
import { User } from '../auth/model.js';
import { Role } from '../users/roleModel.js';
import { NotificationService } from '../notifications/service.js';
import { smsService } from '../../utils/sms.js';
import { baleService } from '../../utils/bale.js';
import { logger } from '../../utils/logger.js';

export class ConsultationService {
  static async createSimpleConsultation(simpleData, userId = null) {
    try {
      const consultationType = simpleData.type || (simpleData.productId ? 'product' : 'service');
      
      // Convert simple form data to full consultation data
      // Support both fullName (new simplified form) and firstName/lastName (old form)
      let fullName;
      if (simpleData.fullName) {
        fullName = simpleData.fullName.trim();
      } else if (simpleData.firstName && simpleData.lastName) {
        fullName = `${simpleData.firstName} ${simpleData.lastName}`.trim();
      } else {
        throw new Error('نام و نام خانوادگی الزامی است');
      }

      let consultationData = {
        fullName: fullName,
        phoneNumber: simpleData.phone,
        email: simpleData.email || `${simpleData.phone}@temp.hikaweb.ir`,
        budget: 'custom',
        timeline: 'flexible',
        preferredContactMethod: 'phone',
        preferredContactTime: 'anytime',
        leadSource: 'website',
        type: consultationType,
        user: userId
      };

      if (consultationType === 'product' && simpleData.productId) {
        // Product consultation
        const product = await Product.findOne({
          _id: simpleData.productId,
          deletedAt: null
        });

        if (!product) {
          throw new Error('محصول انتخابی یافت نشد');
        }

        consultationData.product = product._id;
        consultationData.projectDescription = `درخواست مشاوره قبل از خرید محصول: ${product.name?.fa || product.name || 'محصول انتخابی'}`;
      } else if (simpleData.serviceId) {
        // Service consultation
        const service = await Service.findOne({
          _id: simpleData.serviceId,
          deletedAt: null
        });

        if (!service) {
          throw new Error('خدمت انتخابی یافت نشد');
        }

        consultationData.services = [service._id];
        consultationData.projectDescription = `درخواست مشاوره برای خدمت: ${service.name?.fa || 'خدمت انتخابی'}`;
      } else {
        throw new Error('باید یا serviceId یا productId را ارسال کنید');
      }

      return await this.createConsultation(consultationData);
    } catch (error) {
      logger.error('Simple consultation creation error:', error);
      throw error;
    }
  }

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

      // Validate product exists
      if (consultationData.product) {
        const product = await Product.findOne({
          _id: consultationData.product,
          deletedAt: null
        });

        if (!product) {
          throw new Error('محصول انتخابی نامعتبر است');
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

  static async getConsultations(filters = {}, userId = null, userRole = null, isDashboardRequest = false) {
    try {
      const {
        page = 1,
        limit = 25,
        search = '',
        requestStatus = '',
        status = '', // Support both 'status' and 'requestStatus' for compatibility
        assignedTo = '',
        leadSource = '',
        dateFrom = '',
        dateTo = ''
      } = filters;

      const parsedPage = parseInt(page) || 1;
      const parsedLimit = parseInt(limit) || 25;

      let query = { deletedAt: null };
      let userFilterConditions = [];

      // Check if user has admin access
      const hasAdminAccess = userRole && (
        userRole.permissions?.includes('consultations.read') || 
        userRole.permissions?.includes('admin.all') ||
        userRole.name === 'super_admin' ||
        userRole.name === 'admin'
      );

      // Since the /consultations route requires 'consultations.read' permission (admin-only),
      // we can assume all requests here are from dashboard
      // Admins should see all consultations, regular users (if any) see only their own
      if (userId) {
        if (hasAdminAccess) {
          // Admin users see all consultations (no user filter)
          // This applies to both dashboard and any other admin access
        } else {
          // Regular user (shouldn't happen for this route, but handle it anyway)
          // Show only their consultations
          const user = await User.findById(userId);
          if (user) {
            userFilterConditions.push({ user: userId });
            if (user.phoneNumber) {
              userFilterConditions.push({ phoneNumber: user.phoneNumber });
            }
            if (user.email) {
              userFilterConditions.push({ email: user.email });
            }
          } else {
            query._id = null; // This will return no results
          }
        }
      }

      // Handle search
      let searchConditions = [];
      if (search) {
        searchConditions = [
          { fullName: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
          { phoneNumber: new RegExp(search, 'i') },
          { 'company.name': new RegExp(search, 'i') }
        ];
      }

      // Combine user filter and search conditions
      if (userFilterConditions.length > 0 && searchConditions.length > 0) {
        // Both user filter and search exist - use $and to combine
        query.$and = [
          { $or: userFilterConditions },
          { $or: searchConditions }
        ];
      } else if (userFilterConditions.length > 0) {
        // Only user filter
        query.$or = userFilterConditions;
      } else if (searchConditions.length > 0) {
        // Only search
        query.$or = searchConditions;
      }

      // Support both 'status' and 'requestStatus' query parameters
      const statusFilter = status || requestStatus;
      if (statusFilter) query.requestStatus = statusFilter;
      if (assignedTo) query.assignedTo = assignedTo;
      if (leadSource) query.leadSource = leadSource;

      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      const skip = (parsedPage - 1) * parsedLimit;

      const [consultations, total] = await Promise.all([
        Consultation.find(query)
          .populate('services', 'name')
          .populate('assignedTo', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parsedLimit),
        Consultation.countDocuments(query)
      ]);

      return {
        data: consultations,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit),
          hasNext: parsedPage < Math.ceil(total / parsedLimit),
          hasPrev: parsedPage > 1
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
موبایل: ${consultation.phoneNumber}
خدمات: ${services}
بودجه: ${consultation.budget}
زمان‌بندی: ${consultation.timeline}`;

      // Send Telegram notification
      await baleService.sendSystemAlert(message, 'info');

      // Find admin and super_admin roles
      const adminRoles = await Role.find({
        name: { $in: ['super_admin', 'admin'] },
        deletedAt: null
      });

      // Get admin users (super_admin and admin roles)
      const adminUsers = await User.find({
        role: { $in: adminRoles.map(r => r._id) },
        deletedAt: null
      }).populate('role');

      // Send SMS to admin phone numbers
      const adminPhoneNumbers = adminUsers
        .filter(user => user.phoneNumber && user.isPhoneNumberVerified)
        .map(user => user.phoneNumber);

      if (adminPhoneNumbers.length > 0) {
        const smsMessage = `درخواست مشاوره جدید از ${consultation.fullName} (${consultation.phoneNumber}). لطفاً وارد پنل شوید.`;
        await smsService.sendBulk(adminPhoneNumbers, smsMessage);
      }

      // Create dashboard notifications for admins
      const adminUserIds = adminUsers.map(user => user._id);
      if (adminUserIds.length > 0) {
        await NotificationService.broadcastNotification(adminUserIds, {
          type: 'consultation_new',
          title: {
            fa: 'درخواست مشاوره جدید',
            en: 'New Consultation Request'
          },
          message: {
            fa: `درخواست مشاوره جدید از ${consultation.fullName} برای خدمت ${services}`,
            en: `New consultation request from ${consultation.fullName} for ${services}`
          },
          relatedEntity: {
            type: 'consultation',
            id: consultation._id
          },
          priority: 'high',
          actionUrl: `/dashboard/consultations/${consultation._id}`
        });
      }
    } catch (error) {
      logger.error('New consultation notification error:', error);
    }
  }

  static async notifyConsultationAssignment(consultation) {
    try {
      if (consultation.assignedTo?.phoneNumber) {
        const message = `درخواست مشاوره ${consultation.fullName} به شما واگذار شد. لطفاً پیگیری کنید.`;
        await smsService.sendNotification(consultation.assignedTo.phoneNumber, message);
      }
    } catch (error) {
      logger.error('Assignment notification error:', error);
    }
  }

  static async deleteConsultation(consultationId, userId) {
    try {
      const consultation = await Consultation.findById(consultationId);

      if (!consultation) {
        throw new Error('درخواست مشاوره یافت نشد');
      }

      // Soft delete
      await consultation.softDelete(userId);

      logger.info(`Consultation deleted: ${consultation._id} by user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Consultation deletion error:', error);
      throw error;
    }
  }
}
