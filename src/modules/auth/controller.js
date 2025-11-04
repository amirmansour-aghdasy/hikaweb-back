import { AuthService } from './service.js';
import { User } from './model.js';
import { logger } from '../../utils/logger.js';

export class AuthController {
  /**
   * @swagger
   * /api/v1/auth/register:
   *   post:
   *     summary: ثبت‌نام کاربر جدید
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - email
   *               - password
   *             properties:
   *               name:
   *                 type: string
   *                 minLength: 2
   *                 maxLength: 100
   *               email:
   *                 type: string
   *                 format: email
   *               phoneNumber:
   *                 type: string
   *               password:
   *                 type: string
   *                 minLength: 8
   *               language:
   *                 type: string
   *                 enum: [fa, en]
   *                 default: fa
   *     responses:
   *       201:
   *         description: ثبت‌نام موفقیت‌آمیز
   *       400:
   *         description: خطای اعتبارسنجی
   *       409:
   *         description: کاربر قبلاً وجود دارد
   */
  static async register(req, res, next) {
    try {
      const result = await AuthService.register(req.body);

      logger.info(`New user registered: ${result.user.email}`);

      res.status(201).json({
        success: true,
        message: req.t('auth.registerSuccess'),
        data: {
          user: result.user,
          tokens: result.tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/auth/login:
   *   post:
   *     summary: ورود کاربر
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *               rememberMe:
   *                 type: boolean
   *                 default: false
   *     responses:
   *       200:
   *         description: ورود موفقیت‌آمیز
   *       401:
   *         description: اطلاعات ورود نادرست
   *       423:
   *         description: حساب قفل شده
   */
  static async login(req, res, next) {
    try {
      const { email, password, rememberMe } = req.body;
      const result = await AuthService.login(email, password, rememberMe);

      logger.info(`User logged in: ${email}`);

      res.json({
        success: true,
        message: req.t('auth.loginSuccess'),
        data: {
          user: result.user,
          tokens: result.tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/auth/otp/request:
   *   post:
   *     summary: درخواست کد تایید
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - phoneNumber
   *             properties:
   *               phoneNumber:
   *                 type: string
   *     responses:
   *       200:
   *         description: کد تایید ارسال شد
   *       429:
   *         description: درخواست‌های زیاد
   */
  static async requestOTP(req, res, next) {
    try {
      const { phoneNumber } = req.body;
      const result = await AuthService.requestOTP(phoneNumber);

      res.json({
        success: true,
        message: req.t('auth.otpSent'),
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/auth/otp/verify:
   *   post:
   *     summary: تایید کد OTP
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - phoneNumber
   *               - otp
   *             properties:
   *               phoneNumber:
   *                 type: string
   *               otp:
   *                 type: string
   *                 length: 6
   *     responses:
   *       200:
   *         description: کد تایید با موفقیت تایید شد
   *       400:
   *         description: کد تایید نادرست
   */
  static async verifyOTP(req, res, next) {
    try {
      const { phoneNumber, otp } = req.body;
      const result = await AuthService.verifyOTP(phoneNumber, otp);

      res.json({
        success: true,
        message: req.t('auth.otpVerified'),
        data: {
          user: result.user,
          tokens: result.tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/auth/refresh:
   *   post:
   *     summary: تجدید توکن دسترسی
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - refreshToken
   *             properties:
   *               refreshToken:
   *                 type: string
   *     responses:
   *       200:
   *         description: توکن با موفقیت تجدید شد
   *       401:
   *         description: توکن نامعتبر
   */
  static async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshToken(refreshToken);

      res.json({
        success: true,
        message: req.t('auth.tokenRefreshed'),
        data: {
          user: result.user,
          tokens: result.tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/auth/logout:
   *   post:
   *     summary: خروج کاربر
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               refreshToken:
   *                 type: string
   *     responses:
   *       200:
   *         description: خروج موفقیت‌آمیز
   */
  static async logout(req, res, next) {
    try {
      const token = req.headers.authorization?.substring(7);
      const { refreshToken } = req.body;

      await AuthService.logout(token, refreshToken, req.user.id);

      res.json({
        success: true,
        message: req.t('auth.logoutSuccess')
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/auth/me:
   *   get:
   *     summary: دریافت اطلاعات کاربر فعلی
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: اطلاعات کاربر دریافت شد
   *       401:
   *         description: عدم احراز هویت
   */
  static async me(req, res, next) {
    try {
      const user = await User.findById(req.user.id).populate('role').select('-refreshTokens');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: req.t('auth.userNotFound')
        });
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/auth/change-password:
   *   put:
   *     summary: تغییر رمز عبور
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - currentPassword
   *               - newPassword
   *             properties:
   *               currentPassword:
   *                 type: string
   *               newPassword:
   *                 type: string
   *                 minLength: 8
   *     responses:
   *       200:
   *         description: رمز عبور با موفقیت تغییر کرد
   *       400:
   *         description: رمز عبور فعلی نادرست
   */
  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      await AuthService.changePassword(req.user.id, currentPassword, newPassword);

      res.json({
        success: true,
        message: req.t('auth.passwordChanged')
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/auth/google:
   *   post:
   *     summary: ورود با Google OAuth
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - idToken
   *             properties:
   *               idToken:
   *                 type: string
   *                 description: Google ID Token
   *     responses:
   *       200:
   *         description: ورود موفقیت‌آمیز
   *       400:
   *         description: خطای اعتبارسنجی
   *       401:
   *         description: توکن Google نامعتبر
   */
  static async googleAuth(req, res, next) {
    try {
      const { idToken } = req.body;

      // Verify Google token
      const googleUser = await AuthService.verifyGoogleToken(idToken);

      // Authenticate or create user
      const result = await AuthService.googleAuth(
        googleUser.googleId,
        googleUser.email,
        googleUser.name,
        googleUser.avatar
      );

      logger.info(`Google auth successful: ${googleUser.email}`);

      res.json({
        success: true,
        message: req.t('auth.loginSuccess'),
        data: {
          user: result.user,
          tokens: result.tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/auth/csrf-token:
   *   get:
   *     summary: دریافت CSRF token
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: CSRF token دریافت شد
   *       401:
   *         description: عدم احراز هویت
   */
  static async getCsrfToken(req, res, next) {
    try {
      const { generateCsrfToken } = await import('../../middleware/csrf.js');
      const token = await generateCsrfToken(req.user.id);

      res.json({
        success: true,
        data: { csrfToken: token }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/auth/session:
   *   get:
   *     summary: دریافت session فعلی (NextAuth compatible)
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Session دریافت شد
   */
  static async getSession(req, res, next) {
    try {
      if (!req.user) {
        return res.json({
          user: null,
          expires: null
        });
      }

      const user = await User.findById(req.user.id)
        .populate('role')
        .select('-refreshTokens -password');

      if (!user) {
        return res.json({
          user: null,
          expires: null
        });
      }

      // NextAuth session format
      res.json({
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.avatar,
          role: user.role.name,
          permissions: user.role.permissions
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * NextAuth sign in handler
   */
  static async nextAuthSignIn(req, res, next) {
    try {
      const { provider } = req.params;
      const { email, password, idToken, phoneNumber, otp, rememberMe } = req.body;

      let result;

      switch (provider) {
        case 'credentials':
          if (!email || !password) {
            return res.status(400).json({
              error: 'Missing credentials',
              message: 'Email and password are required'
            });
          }
          result = await AuthService.login(email, password, rememberMe);
          break;

        case 'google':
          if (!idToken) {
            return res.status(400).json({
              error: 'Missing token',
              message: 'Google ID token is required'
            });
          }
          const googleUser = await AuthService.verifyGoogleToken(idToken);
          result = await AuthService.googleAuth(
            googleUser.googleId,
            googleUser.email,
            googleUser.name,
            googleUser.avatar
          );
          break;

        case 'sms':
          if (!phoneNumber || !otp) {
            return res.status(400).json({
              error: 'Missing credentials',
              message: 'phoneNumber and OTP are required'
            });
          }
          result = await AuthService.verifyOTP(phoneNumber, otp);
          break;

        default:
          return res.status(400).json({
            error: 'Invalid provider',
            message: `Provider ${provider} is not supported`
          });
      }

      // NextAuth compatible response
      res.json({
        ok: true,
        user: result.user,
        account: {
          provider,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          expiresAt: Date.now() + (result.tokens.expiresIn || 86400) * 1000
        }
      });
    } catch (error) {
      logger.error('NextAuth sign in error:', error);
      res.status(401).json({
        error: 'Authentication failed',
        message: error.message
      });
    }
  }

  /**
   * NextAuth callback handler (for OAuth flows)
   */
  static async nextAuthCallback(req, res, next) {
    try {
      const { provider } = req.params;
      const { code, state } = req.query;

      // For OAuth callback flows, handle based on provider
      if (provider === 'google' && code) {
        // In a real implementation, exchange code for tokens
        // For now, return error as direct token flow is already implemented
        return res.status(400).json({
          error: 'Use idToken flow',
          message: 'Please use POST /api/v1/auth/google with idToken instead'
        });
      }

      res.status(400).json({
        error: 'Invalid callback',
        message: 'Invalid callback request'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * NextAuth sign out handler
   */
  static async nextAuthSignOut(req, res, next) {
    try {
      const token = req.headers.authorization?.substring(7);
      const { refreshToken } = req.body;

      await AuthService.logout(token, refreshToken, req.user.id);

      res.json({
        ok: true,
        url: '/'
      });
    } catch (error) {
      next(error);
    }
  }
}
