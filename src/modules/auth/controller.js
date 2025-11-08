import { AuthService } from './service.js';
import { User } from './model.js';
import { logger } from '../../utils/logger.js';
import { WebAuthnService } from './webauthnService.js';

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
      const { refreshToken } = req.body || {};

      // Logout should work even if user is not authenticated (for cleanup)
      const userId = req.user?.id || null;
      
      await AuthService.logout(token, refreshToken, userId);

      res.json({
        success: true,
        message: req.t('auth.logoutSuccess')
      });
    } catch (error) {
      // Logout should always succeed, even if there's an error
      logger.error('Logout controller error:', error);
      res.json({
        success: true,
        message: req.t('auth.logoutSuccess')
      });
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
  /**
   * @swagger
   * /api/v1/auth/dashboard/otp/request:
   *   post:
   *     summary: درخواست کد OTP برای ورود به داشبورد
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *     responses:
   *       200:
   *         description: کد OTP ارسال شد
   *       400:
   *         description: خطای اعتبارسنجی
   *       403:
   *         description: دسترسی به داشبورد ندارید
   */
  static async requestDashboardOTP(req, res, next) {
    try {
      const { email } = req.body;
      const result = await AuthService.requestOTPForDashboard(email);

      res.json({
        success: true,
        message: result.message,
        data: {
          expiresIn: result.expiresIn,
          ...(result.token && { token: result.token }) // Only in development
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/auth/dashboard/otp/verify:
   *   post:
   *     summary: تایید کد OTP برای ورود به داشبورد
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - otp
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               otp:
   *                 type: string
   *                 length: 6
   *     responses:
   *       200:
   *         description: ورود موفقیت‌آمیز
   *       400:
   *         description: کد OTP نامعتبر
   */
  static async verifyDashboardOTP(req, res, next) {
    try {
      const { email, otp } = req.body;
      const result = await AuthService.verifyOTPForDashboard(email, otp);

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
   * /api/v1/auth/password/reset/request:
   *   post:
   *     summary: درخواست بازنشانی رمز عبور
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *     responses:
   *       200:
   *         description: لینک بازنشانی ارسال شد
   */
  static async requestPasswordReset(req, res, next) {
    try {
      const { email } = req.body;
      const result = await AuthService.requestPasswordReset(email);

      res.json({
        success: true,
        message: result.message,
        ...(result.token && { data: { token: result.token } }) // Only in development
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/auth/password/reset:
   *   post:
   *     summary: بازنشانی رمز عبور با توکن
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - token
   *               - newPassword
   *             properties:
   *               token:
   *                 type: string
   *               newPassword:
   *                 type: string
   *                 minLength: 8
   *     responses:
   *       200:
   *         description: رمز عبور با موفقیت تغییر کرد
   *       400:
   *         description: توکن نامعتبر یا منقضی شده
   */
  static async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;
      const result = await AuthService.resetPassword(token, newPassword);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

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

  /**
   * @swagger
   * /api/v1/auth/webauthn/register/options:
   *   post:
   *     summary: دریافت گزینه‌های ثبت‌نام بایومتریک
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               deviceName:
   *                 type: string
   *     responses:
   *       200:
   *         description: گزینه‌های ثبت‌نام
   */
  static async getWebAuthnRegistrationOptions(req, res, next) {
    try {
      const { deviceName } = req.body;
      const options = await WebAuthnService.generateRegistrationOptions(req.user.id, deviceName);

      res.json({
        success: true,
        data: options
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/auth/webauthn/register:
   *   post:
   *     summary: ثبت credential بایومتریک
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
   *               - response
   *             properties:
   *               response:
   *                 type: object
   *               deviceName:
   *                 type: string
   *     responses:
   *       200:
   *         description: ثبت موفقیت‌آمیز
   */
  static async registerWebAuthn(req, res, next) {
    try {
      const { response, deviceName } = req.body;
      const result = await WebAuthnService.verifyRegistration(req.user.id, response, deviceName);

      res.json({
        success: true,
        message: 'احراز هویت بایومتریک با موفقیت ثبت شد',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/auth/webauthn/authenticate/options:
   *   post:
   *     summary: دریافت گزینه‌های احراز هویت بایومتریک
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *     responses:
   *       200:
   *         description: گزینه‌های احراز هویت
   */
  static async getWebAuthnAuthenticationOptions(req, res, next) {
    try {
      const { email } = req.body;
      const options = await WebAuthnService.generateAuthenticationOptions(email);

      res.json({
        success: true,
        data: options
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/auth/webauthn/authenticate:
   *   post:
   *     summary: احراز هویت با بایومتریک
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - response
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               response:
   *                 type: object
   *     responses:
   *       200:
   *         description: احراز هویت موفقیت‌آمیز
   */
  static async authenticateWebAuthn(req, res, next) {
    try {
      const { email, response } = req.body;
      const result = await WebAuthnService.verifyAuthentication(email, response);

      if (!result.verified) {
        return res.status(401).json({
          success: false,
          message: 'احراز هویت ناموفق بود'
        });
      }

      // Generate tokens
      const tokens = AuthService.generateTokens(result.user);

      // Store refresh token
      result.user.refreshTokens.push({
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      // Keep only last 5 tokens
      if (result.user.refreshTokens.length > 5) {
        result.user.refreshTokens = result.user.refreshTokens.slice(-5);
      }

      await result.user.save();

      res.json({
        success: true,
        message: 'ورود با موفقیت انجام شد',
        data: {
          user: result.user,
          tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/auth/webauthn/credentials:
   *   get:
   *     summary: دریافت لیست credentials بایومتریک کاربر
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: لیست credentials
   */
  static async getWebAuthnCredentials(req, res, next) {
    try {
      const credentials = await WebAuthnService.getUserCredentials(req.user.id);

      res.json({
        success: true,
        data: credentials
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/auth/webauthn/credentials/:id:
   *   delete:
   *     summary: حذف credential بایومتریک
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: حذف موفقیت‌آمیز
   */
  static async deleteWebAuthnCredential(req, res, next) {
    try {
      const { id } = req.params;
      await WebAuthnService.deleteCredential(req.user.id, id);

      res.json({
        success: true,
        message: 'Credential با موفقیت حذف شد'
      });
    } catch (error) {
      next(error);
    }
  }
}
