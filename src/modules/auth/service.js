import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from './model.js';
import { Role } from '../users/roleModel.js';
import { Consultation } from '../consultations/model.js';
import { config } from '../../config/environment.js';
import { redisClient } from '../../config/redis.js';
import { smsService } from '../../utils/sms.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/appError.js';
import { HTTP_STATUS } from '../../utils/httpStatus.js';

export class AuthService {
  static async register(userData) {
    try {
      // Check if user exists
      const existingUser = await User.findOne({
        $or: [{ email: userData.email }, ...(userData.phoneNumber ? [{ phoneNumber: userData.phoneNumber }] : [])]
      });

      if (existingUser) {
        throw new Error('کاربر قبلاً ثبت‌نام کرده است');
      }

      // Get default role
      const defaultRole = await Role.findOne({ name: 'user' });
      if (!defaultRole) {
        throw new Error('نقش پیش‌فرض یافت نشد');
      }

      // Create user
      const user = new User({
        ...userData,
        role: defaultRole._id
      });

      await user.save();
      await user.populate('role');

      const tokens = this.generateTokens(user);

      // Store refresh token
      user.refreshTokens.push({
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      await user.save();

      return { user, tokens };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  static async login(email, password, rememberMe = false) {
    try {
      const user = await User.findOne({
        email,
        deletedAt: null
      })
        .select('+password')
        .populate('role');

      if (!user) {
        throw new Error('اطلاعات ورود نادرست است');
      }

      if (user.isLocked()) {
        throw new Error('حساب به دلیل تلاش‌های ناموفق قفل شده است');
      }

      const isPasswordValid = await user.matchPassword(password);

      if (!isPasswordValid) {
        await user.incrementLoginAttempts();
        throw new Error('اطلاعات ورود نادرست است');
      }

      // Reset attempts on success
      if (user.loginAttempts > 0) {
        await user.updateOne({
          $unset: { loginAttempts: 1, lockUntil: 1 }
        });
      }

      user.lastLogin = new Date();
      await user.save();

      const expiresIn = rememberMe ? '30d' : config.JWT_EXPIRES_IN;
      const tokens = this.generateTokens(user, expiresIn);

      // Store refresh token
      user.refreshTokens.push({
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000)
      });

      // Keep only last 5 tokens
      if (user.refreshTokens.length > 5) {
        user.refreshTokens = user.refreshTokens.slice(-5);
      }

      await user.save();

      return { user, tokens };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  static async requestOTP(phoneNumber) {
    try {
      const otp = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // Store in Redis
      const redis = redisClient.getClient();
      await redis.setEx(
        `otp:${phoneNumber}`,
        300,
        JSON.stringify({
          otp,
          expiresAt,
          attempts: 0
        })
      );

      // Send SMS
      await smsService.sendOTP(phoneNumber, otp);

      logger.info(`OTP sent to ${phoneNumber}`);

      return {
        message: 'کد تایید ارسال شد',
        expiresIn: 300
      };
    } catch (error) {
      logger.error('OTP verification error:', error);
      throw error;
    }
  }

  /**
   * Request OTP for changing phone number (authenticated users only)
   * Checks if the new phone number is unique before sending OTP
   */
  static async requestOTPForPhoneChange(userId, newPhoneNumber) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw AppError.notFound('کاربر یافت نشد');
      }

      // Normalize phone number for comparison (handle different formats)
      const normalizePhoneForQuery = (phone) => {
        if (!phone) return null;
        // Remove all non-digit characters
        let normalized = phone.replace(/\D/g, '');
        // Remove leading 98 or 0
        if (normalized.startsWith('98')) {
          normalized = normalized.substring(2);
        } else if (normalized.startsWith('0')) {
          normalized = normalized.substring(1);
        }
        return normalized;
      };

      const normalizedNewPhone = normalizePhoneForQuery(newPhoneNumber);
      
      if (!normalizedNewPhone) {
        throw AppError.badRequest('شماره موبایل نامعتبر است');
      }

      // Check if new phone number is the same as current phone number
      const normalizedCurrentPhone = normalizePhoneForQuery(user.phoneNumber);
      if (normalizedNewPhone === normalizedCurrentPhone) {
        throw AppError.badRequest('شماره موبایل جدید باید با شماره فعلی متفاوت باشد');
      }

      // Check all possible formats of the phone number
      const phoneFormats = [
        newPhoneNumber,
        `0${normalizedNewPhone}`,
        `+98${normalizedNewPhone}`,
        `98${normalizedNewPhone}`,
        normalizedNewPhone
      ];

      // Check if another user already has this phone number in any format
      const existingUser = await User.findOne({
        _id: { $ne: userId },
        phoneNumber: { $in: phoneFormats },
        deletedAt: null
      });

      if (existingUser) {
        throw AppError.conflict('شماره موبایل وارد شده قبلاً توسط کاربر دیگری استفاده شده است');
      }

      // Phone number is unique, proceed with OTP request
      return await this.requestOTP(newPhoneNumber);
    } catch (error) {
      // If error is already an AppError, re-throw it
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Request OTP for phone change error:', error);
      throw error;
    }
  }

  static async verifyOTP(phoneNumber, otp, additionalData = {}) {
    try {
      const redis = redisClient.getClient();
      const otpData = await redis.get(`otp:${phoneNumber}`);

      if (!otpData) {
        throw new Error('کد تایید منقضی شده یا یافت نشد');
      }

      const { otp: storedOTP, expiresAt, attempts } = JSON.parse(otpData);

      if (attempts >= 3) {
        await redis.del(`otp:${phoneNumber}`);
        throw new Error('تلاش‌های زیادی انجام شده است');
      }

      if (new Date() > new Date(expiresAt)) {
        await redis.del(`otp:${phoneNumber}`);
        throw new Error('کد تایید منقضی شده است');
      }

      if (otp !== storedOTP) {
        await redis.setEx(
          `otp:${phoneNumber}`,
          300,
          JSON.stringify({
            otp: storedOTP,
            expiresAt,
            attempts: attempts + 1
          })
        );
        throw new Error('کد تایید نادرست است');
      }

      // Clean up
      await redis.del(`otp:${phoneNumber}`);

      // Find or create user
      let user = await User.findOne({ phoneNumber }).populate('role');

      if (!user) {
        // New user registration
        const defaultRole = await Role.findOne({ name: 'user' });
        if (!defaultRole) {
          throw new Error('نقش پیش‌فرض یافت نشد');
        }

        const userData = {
          phoneNumber,
          isPhoneNumberVerified: true,
          role: defaultRole._id,
          name: additionalData.name || `کاربر_${phoneNumber.slice(-4)}`
        };

        // Add email if provided
        if (additionalData.email) {
          // Check if email is already taken
          const existingEmail = await User.findOne({ email: additionalData.email });
          if (existingEmail) {
            logger.warn(`Email ${additionalData.email} already exists, skipping email assignment`);
          } else {
            userData.email = additionalData.email.toLowerCase().trim();
          }
        }

        user = new User(userData);
        await user.save();
        await user.populate('role');
        
        // Link existing consultations with this phone number to the new user
        await this.linkConsultationsToUser(user._id, phoneNumber, user.email);
        
        logger.info(`New user registered via OTP: ${phoneNumber}`);
      } else {
        // Existing user login
        // Use updateOne to avoid validation issues (password/email might be required in schema)
        const updateData = {
          isPhoneNumberVerified: true,
          lastLogin: new Date()
        };
        
        // Update name if provided and not already set
        if (additionalData.name && !user.name) {
          updateData.name = additionalData.name;
        }
        
        // Update email if provided and not already set
        if (additionalData.email && !user.email) {
          // Check if email is already taken
          const existingEmail = await User.findOne({ email: additionalData.email });
          if (!existingEmail) {
            updateData.email = additionalData.email.toLowerCase().trim();
          }
        }
        
        // Use updateOne instead of save to avoid validation issues
        await User.updateOne({ _id: user._id }, { $set: updateData });
        
        // Reload user to get updated data (must reload after updateOne)
        user = await User.findById(user._id).populate('role');
      }

      const tokens = this.generateTokens(user);

      // Store refresh token using updateOne to avoid validation issues
      const refreshTokenData = {
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date()
      };
      
      // Get current refresh tokens and add new one
      const currentTokens = user.refreshTokens || [];
      const updatedTokens = [...currentTokens, refreshTokenData];
      
      // Keep only last 5 tokens
      const tokensToKeep = updatedTokens.slice(-5);
      
      // Use updateOne to avoid validation issues
      await User.updateOne(
        { _id: user._id },
        { $set: { refreshTokens: tokensToKeep } }
      );
      
      // Update user object for response
      user.refreshTokens = tokensToKeep;

      return { user, tokens };
    } catch (error) {
      logger.error('OTP verification error:', error);
      throw error;
    }
  }

  static async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);

      const user = await User.findById(decoded.id).populate('role').select('+refreshTokens');

      if (!user) {
        throw new Error('کاربر یافت نشد');
      }

      const tokenIndex = user.refreshTokens.findIndex(
        rt => rt.token === refreshToken && rt.expiresAt > new Date()
      );

      if (tokenIndex === -1) {
        throw new Error('توکن نامعتبر یا منقضی شده است');
      }

      // Remove old token
      user.refreshTokens.splice(tokenIndex, 1);

      // Generate new tokens
      const tokens = this.generateTokens(user);

      // Store new refresh token
      user.refreshTokens.push({
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      await user.save();

      return { user, tokens };
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  static async logout(token, refreshToken, userId) {
    try {
      // Blacklist access token (if provided)
      if (token) {
        try {
          const redis = redisClient.getClient();
          const decoded = jwt.decode(token);
          if (decoded && decoded.exp) {
            const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
            if (expiresIn > 0) {
              await redis.setEx(`blacklist:${token}`, expiresIn, 'true');
            }
          }
        } catch (redisError) {
          // If Redis is unavailable, continue without blacklist
          logger.warn('Redis unavailable for token blacklist:', redisError.message);
        }
      }

      // Remove refresh token (if provided)
      if (refreshToken && userId) {
        await User.findByIdAndUpdate(userId, {
          $pull: { refreshTokens: { token: refreshToken } }
        });
      }

      logger.info(`User ${userId || 'unknown'} logged out`);
    } catch (error) {
      logger.error('Logout error:', error);
      // Don't throw - logout should always succeed even if cleanup fails
    }
  }

  static generateTokens(user, expiresIn = config.JWT_EXPIRES_IN) {
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions
    };

    const accessToken = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn,
      issuer: 'hikaweb',
      audience: 'hikaweb-clients'
    });

    const refreshToken = jwt.sign({ id: user._id }, config.JWT_REFRESH_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN,
      issuer: 'hikaweb',
      audience: 'hikaweb-clients'
    });

    return { accessToken, refreshToken, expiresIn };
  }

  static async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select('+password');

      if (!user) {
        throw new Error('کاربر یافت نشد');
      }

      const isCurrentPasswordValid = await user.matchPassword(currentPassword);

      if (!isCurrentPasswordValid) {
        throw new Error('رمز عبور فعلی نادرست است');
      }

      user.password = newPassword;
      await user.save();

      // Clear all refresh tokens
      user.refreshTokens = [];
      await user.save();

      logger.info(`Password changed for user ${user.email}`);
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  }

  static async updateProfile(userId, profileData) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('کاربر یافت نشد');
      }

      // Normalize phone number for comparison (handle different formats)
      const normalizePhoneForQuery = (phone) => {
        if (!phone) return null;
        // Remove all non-digit characters
        let normalized = phone.replace(/\D/g, '');
        // Remove leading 98 or 0
        if (normalized.startsWith('98')) {
          normalized = normalized.substring(2);
        } else if (normalized.startsWith('0')) {
          normalized = normalized.substring(1);
        }
        return normalized;
      };

      // Check phoneNumber uniqueness if changed
      if (profileData.phoneNumber !== undefined) {
        const newPhoneNumber = profileData.phoneNumber ? profileData.phoneNumber.trim() : null;
        
        // Only check if phone number is actually changing
        if (newPhoneNumber !== user.phoneNumber) {
          const normalizedNewPhone = normalizePhoneForQuery(newPhoneNumber);
          
          if (normalizedNewPhone) {
            // Check all possible formats of the phone number
            const phoneFormats = [
              newPhoneNumber,
              `0${normalizedNewPhone}`,
              `+98${normalizedNewPhone}`,
              `98${normalizedNewPhone}`,
              normalizedNewPhone
            ];

            // Check if another user already has this phone number in any format
            const existingUser = await User.findOne({
              _id: { $ne: userId },
              phoneNumber: { $in: phoneFormats },
              deletedAt: null
            });

            if (existingUser) {
              throw AppError.conflict('شماره موبایل وارد شده قبلاً توسط کاربر دیگری استفاده شده است');
            }
          }
        }
      }

      // Update allowed fields
      if (profileData.name !== undefined) {
        user.name = profileData.name;
      }
      // Phone number should only be updated through OTP verification endpoint
      // Do not allow direct phone number updates through updateProfile
      if (profileData.phoneNumber !== undefined) {
        // Only allow setting phoneNumber to null or empty (removing it)
        // Actual phone number changes must go through OTP verification
        if (!profileData.phoneNumber || profileData.phoneNumber.trim() === '') {
          user.phoneNumber = null;
        } else {
          // If trying to set a phone number directly, check if it's the same as current
          const normalizedCurrent = normalizePhoneForQuery(user.phoneNumber);
          const normalizedNew = normalizePhoneForQuery(profileData.phoneNumber.trim());
          
          if (normalizedCurrent !== normalizedNew) {
            throw AppError.badRequest('برای تغییر شماره موبایل باید از طریق تأیید OTP اقدام کنید');
          }
          // If it's the same, allow it (no change)
        }
      }
      if (profileData.avatar !== undefined) {
        user.avatar = profileData.avatar || null;
      }
      if (profileData.language !== undefined) {
        user.language = profileData.language;
      }

      await user.save();
      await user.populate('role');

      logger.info(`Profile updated for user ${user.email}`);
      return user;
    } catch (error) {
      logger.error('Update profile error:', error);
      throw error;
    }
  }

  /**
   * Verify phone number OTP and update user's phone number
   * This is used when user wants to change their phone number
   */
  static async verifyPhoneNumberOTP(userId, newPhoneNumber, otp) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('کاربر یافت نشد');
      }

      // Verify OTP for the new phone number
      const redis = redisClient.getClient();
      const otpData = await redis.get(`otp:${newPhoneNumber}`);

      if (!otpData) {
        throw new Error('کد تایید منقضی شده یا یافت نشد');
      }

      const { otp: storedOTP, expiresAt, attempts } = JSON.parse(otpData);

      if (attempts >= 3) {
        await redis.del(`otp:${newPhoneNumber}`);
        throw new Error('تلاش‌های زیادی انجام شده است');
      }

      if (new Date() > new Date(expiresAt)) {
        await redis.del(`otp:${newPhoneNumber}`);
        throw new Error('کد تایید منقضی شده است');
      }

      if (otp !== storedOTP) {
        await redis.setEx(
          `otp:${newPhoneNumber}`,
          300,
          JSON.stringify({
            otp: storedOTP,
            expiresAt,
            attempts: attempts + 1
          })
        );
        throw new Error('کد تایید نادرست است');
      }

      // OTP verified successfully - clean up
      await redis.del(`otp:${newPhoneNumber}`);

      // Normalize phone number for comparison (handle different formats)
      const normalizePhoneForQuery = (phone) => {
        if (!phone) return null;
        // Remove all non-digit characters
        let normalized = phone.replace(/\D/g, '');
        // Remove leading 98 or 0
        if (normalized.startsWith('98')) {
          normalized = normalized.substring(2);
        } else if (normalized.startsWith('0')) {
          normalized = normalized.substring(1);
        }
        return normalized;
      };

      const normalizedNewPhone = normalizePhoneForQuery(newPhoneNumber);
      
      if (normalizedNewPhone) {
        // Check all possible formats of the phone number
        const phoneFormats = [
          newPhoneNumber,
          `0${normalizedNewPhone}`,
          `+98${normalizedNewPhone}`,
          `98${normalizedNewPhone}`,
          normalizedNewPhone
        ];

        // Check if new phone number is already taken by another user in any format
        const existingUser = await User.findOne({ 
          phoneNumber: { $in: phoneFormats },
          _id: { $ne: userId }
        });

        if (existingUser) {
          throw new Error('این شماره موبایل قبلاً توسط کاربر دیگری استفاده شده است');
        }
      }

      // Update phone number and mark as verified
      const oldPhoneNumber = user.phoneNumber;
      user.phoneNumber = newPhoneNumber;
      user.isPhoneNumberVerified = true;
      await user.save();
      await user.populate('role');

      logger.info(`Phone number updated for user ${user.email} from ${oldPhoneNumber} to ${newPhoneNumber}`);
      return user;
    } catch (error) {
      logger.error('Verify phone number OTP error:', error);
      throw error;
    }
  }

  static async getSessions(userId, currentRefreshToken = null) {
    try {
      const user = await User.findById(userId).select('+refreshTokens');

      if (!user) {
        throw new Error('کاربر یافت نشد');
      }

      // Filter out expired tokens and return session info
      const sessions = user.refreshTokens
        .filter(rt => rt.expiresAt > new Date())
        .map((rt, index) => ({
          id: rt._id?.toString() || index.toString(),
          createdAt: rt.createdAt,
          expiresAt: rt.expiresAt,
          isCurrent: currentRefreshToken ? rt.token === currentRefreshToken : false,
        }));

      return sessions;
    } catch (error) {
      logger.error('Get sessions error:', error);
      throw error;
    }
  }

  static async revokeSession(userId, sessionId, currentRefreshToken = null) {
    try {
      const user = await User.findById(userId).select('+refreshTokens');

      if (!user) {
        throw new Error('کاربر یافت نشد');
      }

      // Check if we're revoking the current session
      const sessionToRevoke = user.refreshTokens.find(
        rt => rt._id?.toString() === sessionId
      );
      
      const isCurrentSession = currentRefreshToken && sessionToRevoke && sessionToRevoke.token === currentRefreshToken;

      // Remove the session
      user.refreshTokens = user.refreshTokens.filter(
        rt => rt._id?.toString() !== sessionId
      );

      await user.save();

      logger.info(`Session revoked for user ${user.email}`);
      return { revoked: true, isCurrentSession };
    } catch (error) {
      logger.error('Revoke session error:', error);
      throw error;
    }
  }

  static async revokeAllSessions(userId, currentRefreshToken = null) {
    try {
      const user = await User.findById(userId).select('+refreshTokens');

      if (!user) {
        throw new Error('کاربر یافت نشد');
      }

      // Check if current session will be revoked
      const isCurrentSessionRevoked = currentRefreshToken && 
        user.refreshTokens.some(rt => rt.token === currentRefreshToken);

      // Clear all refresh tokens
      user.refreshTokens = [];
      await user.save();

      logger.info(`All sessions revoked for user ${user.email}`);
      return { revoked: true, isCurrentSessionRevoked };
    } catch (error) {
      logger.error('Revoke all sessions error:', error);
      throw error;
    }
  }

  /**
   * Request OTP for dashboard login via SMS or Email
   * User must have phoneNumber or email and be an admin role
   * @param {string} emailOrPhone - Email or phone number
   */
  static async requestOTPForDashboard(emailOrPhone) {
    try {
      // Determine if input is email or phone number
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone);
      const isPhoneNumber = /^(\+98|0)?9\d{9}$/.test(emailOrPhone);

      if (!isEmail && !isPhoneNumber) {
        throw new Error('لطفاً ایمیل یا شماره موبایل معتبر وارد کنید');
      }

      // Normalize phone number (remove +98 or 0 prefix)
      let normalizedPhone = null;
      if (isPhoneNumber) {
        normalizedPhone = emailOrPhone.replace(/^(\+98|0)/, '');
        if (!normalizedPhone.startsWith('9')) {
          normalizedPhone = '9' + normalizedPhone;
        }
      }

      // Find user by email or phoneNumber
      const query = isEmail 
        ? { email: emailOrPhone.toLowerCase().trim(), deletedAt: null }
        : { phoneNumber: normalizedPhone, deletedAt: null };
      
      const user = await User.findOne(query).populate('role');
      
      if (!user) {
        throw new Error('کاربری با این اطلاعات یافت نشد');
      }

      // Check if user has dashboard access
      const allowedRoles = ['super_admin', 'admin', 'editor', 'moderator'];
      const userRole = user.role?.name || user.role;
      
      if (!allowedRoles.includes(userRole)) {
        throw new Error('شما دسترسی به پنل مدیریت ندارید');
      }

      // Generate OTP
      const otp = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Use email or phoneNumber as key for Redis
      const redisKey = isEmail ? `otp:dashboard:${emailOrPhone.toLowerCase().trim()}` : `otp:dashboard:${normalizedPhone}`;
      
      // Store in Redis
      const redis = redisClient.getClient();
      await redis.setEx(
        redisKey,
        300,
        JSON.stringify({
          otp,
          expiresAt,
          attempts: 0,
          identifier: isEmail ? user.email : user.phoneNumber
        })
      );

      // Send OTP via SMS or Email
      if (isPhoneNumber) {
        // Send SMS
        if (!user.phoneNumber) {
          throw new Error('شماره موبایل ثبت نشده است. لطفاً با مدیر سیستم تماس بگیرید');
        }
        await smsService.sendOTP(user.phoneNumber, otp);
        logger.info(`Dashboard OTP sent via SMS to ${user.phoneNumber}`);
        
        return {
          message: 'کد تایید به شماره موبایل شما ارسال شد',
          expiresIn: 300
        };
      } else {
        // Send Email
        if (!user.email) {
          throw new Error('ایمیل ثبت نشده است. لطفاً با مدیر سیستم تماس بگیرید');
        }
        
        // Import email service dynamically
        try {
          const { emailService } = await import('../../utils/email.js');
          await emailService.sendOTP(user.email, otp);
          logger.info(`Dashboard OTP sent via Email to ${user.email}`);
        } catch (error) {
          logger.error('Failed to send email OTP:', error);
          // Fallback: log OTP in development
          if (process.env.NODE_ENV === 'development') {
            logger.info(`[DEV] OTP for ${user.email}: ${otp}`);
          }
        }
        
        return {
          message: 'کد تایید به ایمیل شما ارسال شد',
          expiresIn: 300
        };
      }
    } catch (error) {
      logger.error('Dashboard OTP request error:', error);
      throw error;
    }
  }

  /**
   * Verify OTP for dashboard login
   * @param {string} emailOrPhone - Email or phone number
   * @param {string} otp - OTP code
   */
  static async verifyOTPForDashboard(emailOrPhone, otp) {
    try {
      // Determine if input is email or phone number
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone);
      const isPhoneNumber = /^(\+98|0)?9\d{9}$/.test(emailOrPhone);

      if (!isEmail && !isPhoneNumber) {
        throw new Error('لطفاً ایمیل یا شماره موبایل معتبر وارد کنید');
      }

      // Normalize phone number (remove +98 or 0 prefix)
      let normalizedPhone = null;
      if (isPhoneNumber) {
        normalizedPhone = emailOrPhone.replace(/^(\+98|0)/, '');
        if (!normalizedPhone.startsWith('9')) {
          normalizedPhone = '9' + normalizedPhone;
        }
      }

      // Use email or phoneNumber as key for Redis
      const redisKey = isEmail ? `otp:dashboard:${emailOrPhone.toLowerCase().trim()}` : `otp:dashboard:${normalizedPhone}`;
      
      const redis = redisClient.getClient();
      const otpData = await redis.get(redisKey);

      if (!otpData) {
        throw new Error('کد تایید منقضی شده یا یافت نشد');
      }

      const { otp: storedOTP, expiresAt, attempts, identifier } = JSON.parse(otpData);

      if (attempts >= 3) {
        await redis.del(redisKey);
        throw new Error('تلاش‌های زیادی انجام شده است. لطفاً دوباره درخواست دهید');
      }

      if (new Date() > new Date(expiresAt)) {
        await redis.del(redisKey);
        throw new Error('کد تایید منقضی شده است');
      }

      if (otp !== storedOTP) {
        await redis.setEx(
          redisKey,
          300,
          JSON.stringify({
            otp: storedOTP,
            expiresAt,
            attempts: attempts + 1,
            identifier
          })
        );
        throw new Error('کد تایید نادرست است');
      }

      // Clean up
      await redis.del(redisKey);

      // Find user by identifier (email or phoneNumber)
      const query = isEmail 
        ? { email: emailOrPhone.toLowerCase().trim(), deletedAt: null }
        : { phoneNumber: normalizedPhone, deletedAt: null };
      
      const user = await User.findOne(query).populate('role');
      
      if (!user) {
        throw new Error('کاربر یافت نشد');
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens
      const tokens = this.generateTokens(user);

      return { user, tokens };
    } catch (error) {
      logger.error('Dashboard OTP verification error:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   * Generates a reset token and sends it via SMS
   */
  static async requestPasswordReset(email) {
    try {
      const user = await User.findOne({ email, deletedAt: null });

      if (!user) {
        // Don't reveal if user exists or not (security best practice)
        return {
          message: 'اگر این ایمیل در سیستم وجود داشته باشد، لینک بازنشانی رمز عبور ارسال خواهد شد'
        };
      }

      // Check if user has phoneNumber
      if (!user.phoneNumber) {
        throw new Error('شماره موبایل ثبت نشده است. لطفاً با مدیر سیستم تماس بگیرید');
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store in Redis
      const redis = redisClient.getClient();
      await redis.setEx(
        `password-reset:${resetToken}`,
        3600,
        JSON.stringify({
          userId: user._id.toString(),
          email: user.email,
          expiresAt: resetTokenExpiry
        })
      );

      // Send reset token via SMS
      const resetLink = `${process.env.DASHBOARD_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
      const smsMessage = `لینک بازنشانی رمز عبور شما: ${resetLink}`;
      
      await smsService.sendNotification(user.phoneNumber, smsMessage);

      logger.info(`Password reset requested for ${email}`);

      return {
        message: 'لینک بازنشانی رمز عبور به شماره موبایل شما ارسال شد',
        // In production, don't return the token. For now, return it for testing
        token: process.env.NODE_ENV === 'development' ? resetToken : undefined
      };
    } catch (error) {
      logger.error('Password reset request error:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token, newPassword) {
    try {
      const redis = redisClient.getClient();
      const resetData = await redis.get(`password-reset:${token}`);

      if (!resetData) {
        throw new Error('لینک بازنشانی نامعتبر یا منقضی شده است');
      }

      const { userId, email, expiresAt } = JSON.parse(resetData);

      if (new Date() > new Date(expiresAt)) {
        await redis.del(`password-reset:${token}`);
        throw new Error('لینک بازنشانی منقضی شده است');
      }

      // Find user
      const user = await User.findById(userId);

      if (!user || user.email !== email) {
        throw new Error('کاربر یافت نشد');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Clear all refresh tokens
      user.refreshTokens = [];
      await user.save();

      // Delete reset token
      await redis.del(`password-reset:${token}`);

      logger.info(`Password reset for user ${email}`);

      return {
        message: 'رمز عبور با موفقیت تغییر کرد'
      };
    } catch (error) {
      logger.error('Password reset error:', error);
      throw error;
    }
  }

  static async googleAuth(googleId, email, name, avatar) {
    try {
      let user = await User.findOne({ googleId }).populate('role');

      if (user) {
        // Existing user - update last login
        user.lastLogin = new Date();
        await user.save();
      } else {
        // Check if user exists with this email
        user = await User.findOne({ email }).populate('role');

        if (user) {
          // Link Google account to existing user
          user.googleId = googleId;
          if (avatar) user.avatar = avatar;
          user.lastLogin = new Date();
          await user.save();
        } else {
          // Create new user
          const defaultRole = await Role.findOne({ name: 'user' });
          if (!defaultRole) {
            throw new Error('نقش پیش‌فرض یافت نشد');
          }

          user = new User({
            name,
            email,
            googleId,
            avatar,
            role: defaultRole._id,
            isEmailVerified: true,
            lastLogin: new Date()
          });

          await user.save();
          await user.populate('role');
        }
      }

      const tokens = this.generateTokens(user);

      // Store refresh token
      user.refreshTokens.push({
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      // Keep only last 5 tokens
      if (user.refreshTokens.length > 5) {
        user.refreshTokens = user.refreshTokens.slice(-5);
      }

      await user.save();

      return { user, tokens };
    } catch (error) {
      logger.error('Google auth error:', error);
      throw error;
    }
  }

  static async verifyGoogleToken(idToken) {
    try {
      // For production, use Google's token verification
      // This is a simplified version - you should use google-auth-library in production
      const axios = (await import('axios')).default;
      const { config } = await import('../../config/environment.js');

      const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);

      if (response.data.aud !== config.GOOGLE_CLIENT_ID) {
        throw new Error('Invalid Google token');
      }

      return {
        googleId: response.data.sub,
        email: response.data.email,
        name: response.data.name,
        avatar: response.data.picture
      };
    } catch (error) {
      logger.error('Google token verification error:', error);
      throw new Error('تایید توکن Google ناموفق بود');
    }
  }

  /**
   * Link existing consultations to a newly registered user
   * This method searches for consultations with matching phone number or email
   * and logs them for reference. The consultations can be found by phone/email in the profile.
   * 
   * Note: Currently, Consultation model doesn't have a direct 'user' field.
   * Consultations are linked via phoneNumber/email matching in getConsultations.
   * In the future, we can add a 'user' field to Consultation model for better linking.
   */
  static async linkConsultationsToUser(userId, phoneNumber, email = null) {
    try {
      // Normalize phone number (remove +98, leading zeros, etc.)
      const normalizePhone = (phone) => {
        if (!phone) return null;
        // Remove all non-digit characters
        let normalized = phone.replace(/\D/g, '');
        // Remove leading 98 or 0
        if (normalized.startsWith('98')) {
          normalized = normalized.substring(2);
        } else if (normalized.startsWith('0')) {
          normalized = normalized.substring(1);
        }
        return normalized;
      };

      const normalizedPhone = normalizePhone(phoneNumber);
      
      // Build query to find consultations
      const query = {
        deletedAt: null,
        $or: []
      };

      // Match by phone number (normalized)
      if (normalizedPhone) {
        // Try different phone number formats
        query.$or.push(
          { phoneNumber: phoneNumber },
          { phoneNumber: `0${normalizedPhone}` },
          { phoneNumber: `+98${normalizedPhone}` },
          { phoneNumber: `98${normalizedPhone}` },
          { phoneNumber: normalizedPhone }
        );
      }

      // Match by email if provided
      if (email) {
        query.$or.push({ email: email.toLowerCase().trim() });
      }

      // If no conditions, return early
      if (query.$or.length === 0) {
        return;
      }

      // Find consultations that match
      const consultations = await Consultation.find(query).select('_id fullName phoneNumber email createdAt');

      if (consultations.length === 0) {
        logger.info(`No existing consultations found to link for user ${userId} (${phoneNumber})`);
        return;
      }

      // Link consultations to user by updating the 'user' field
      await Consultation.updateMany(
        { _id: { $in: consultations.map(c => c._id) } },
        { $set: { user: userId } }
      );
      
      logger.info(`Linked ${consultations.length} existing consultations to user ${userId} (${phoneNumber})`);
    } catch (error) {
      logger.error('Error linking consultations to user:', error);
      // Don't throw - this is not critical for user registration
    }
  }
}
