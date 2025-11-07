import { Router } from 'express';
import { AuthController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate } from '../../middleware/auth.js';
import { auditLog } from '../../middleware/audit.js';
import { authLimiter, otpLimiter, passwordResetLimiter } from '../../middleware/rateLimit.js';
import { requireDashboardAccess } from '../../middleware/dashboardAccess.js';
import { 
  registerSchema, 
  loginSchema, 
  otpRequestSchema, 
  otpVerifySchema,
  refreshTokenSchema,
  changePasswordSchema,
  googleAuthSchema,
  dashboardOTPRequestSchema,
  dashboardOTPVerifySchema,
  passwordResetRequestSchema,
  passwordResetSchema
} from './validation.js';

const router = Router();

// Public routes
router.post('/register', 
  authLimiter,
  validate(registerSchema),
  auditLog('REGISTER', 'users'),
  AuthController.register
);

router.post('/login',
  authLimiter,
  validate(loginSchema),
  auditLog('LOGIN', 'users'),
  AuthController.login
);

router.post('/otp/request',
  otpLimiter,
  validate(otpRequestSchema),
  auditLog('OTP_REQUEST', 'users'),
  AuthController.requestOTP
);

router.post('/otp/verify',
  authLimiter,
  validate(otpVerifySchema),
  auditLog('OTP_VERIFY', 'users'),
  AuthController.verifyOTP
);

router.post('/refresh',
  validate(refreshTokenSchema),
  AuthController.refreshToken
);

router.post('/google',
  authLimiter,
  validate(googleAuthSchema),
  auditLog('GOOGLE_AUTH', 'users'),
  AuthController.googleAuth
);

// Dashboard OTP routes (public)
router.post('/dashboard/otp/request',
  otpLimiter,
  validate(dashboardOTPRequestSchema),
  auditLog('DASHBOARD_OTP_REQUEST', 'users'),
  AuthController.requestDashboardOTP
);

router.post('/dashboard/otp/verify',
  authLimiter,
  validate(dashboardOTPVerifySchema),
  auditLog('DASHBOARD_OTP_VERIFY', 'users'),
  AuthController.verifyDashboardOTP
);

// Password reset routes (public)
router.post('/password/reset/request',
  passwordResetLimiter,
  validate(passwordResetRequestSchema),
  auditLog('PASSWORD_RESET_REQUEST', 'users'),
  AuthController.requestPasswordReset
);

router.post('/password/reset',
  passwordResetLimiter,
  validate(passwordResetSchema),
  auditLog('PASSWORD_RESET', 'users'),
  AuthController.resetPassword
);

// Protected routes
router.use(authenticate);

router.get('/csrf-token',
  AuthController.getCsrfToken
);

router.post('/logout',
  auditLog('LOGOUT', 'users'),
  AuthController.logout
);

router.get('/me',
  requireDashboardAccess,
  AuthController.me
);

router.put('/change-password',
  validate(changePasswordSchema),
  auditLog('CHANGE_PASSWORD', 'users'),
  AuthController.changePassword
);

export default router;