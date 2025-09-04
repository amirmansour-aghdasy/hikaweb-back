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
   *               mobile:
   *                 type: string
   *                 pattern: '^(\+98|0)?9\d{9}TP request error:', error);
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
   *               - mobile
   *             properties:
   *               mobile:
   *                 type: string
   *     responses:
   *       200:
   *         description: کد تایید ارسال شد
   *       429:
   *         description: درخواست‌های زیاد
   */
  static async requestOTP(req, res, next) {
    try {
      const { mobile } = req.body;
      const result = await AuthService.requestOTP(mobile);
      
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
   *               - mobile
   *               - otp
   *             properties:
   *               mobile:
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
      const { mobile, otp } = req.body;
      const result = await AuthService.verifyOTP(mobile, otp);
      
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
      const user = await User.findById(req.user.id)
        .populate('role')
        .select('-refreshTokens');
      
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
}