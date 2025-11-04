import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from './model.js';
import { Role } from '../users/roleModel.js';
import { config } from '../../config/environment.js';
import { redisClient } from '../../config/redis.js';
import { smsService } from '../../utils/sms.js';
import { logger } from '../../utils/logger.js';

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

  static async verifyOTP(phoneNumber, otp) {
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
        const defaultRole = await Role.findOne({ name: 'user' });
        user = new User({
            phoneNumber,
          isPhoneNumberVerified: true,
          role: defaultRole._id,
          name: `کاربر_${phoneNumber.slice(-4)}`
        });
        await user.save();
        await user.populate('role');
      } else {
        user.isPhoneNumbereVerified = true;
        user.lastLogin = new Date();
        await user.save();
      }

      const tokens = this.generateTokens(user);

      return { user, tokens };
    } catch (error) {
      logger.error('OTP request error:', error);
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
      const redis = redisClient.getClient();

      // Blacklist access token
      const decoded = jwt.decode(token);
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

      if (expiresIn > 0) {
        await redis.setEx(`blacklist:${token}`, expiresIn, 'true');
      }

      // Remove refresh token
      if (refreshToken && userId) {
        await User.findByIdAndUpdate(userId, {
          $pull: { refreshTokens: { token: refreshToken } }
        });
      }

      logger.info(`User ${userId} logged out`);
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
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
}
