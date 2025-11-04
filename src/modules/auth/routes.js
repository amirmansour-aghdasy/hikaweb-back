import { Router } from 'express';
import { AuthController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate } from '../../middleware/auth.js';
import { auditLog } from '../../middleware/audit.js';
import { authLimiter, otpLimiter } from '../../middleware/rateLimit.js';
import { 
  registerSchema, 
  loginSchema, 
  otpRequestSchema, 
  otpVerifySchema,
  refreshTokenSchema,
  changePasswordSchema,
  googleAuthSchema
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
  AuthController.me
);

router.put('/change-password',
  validate(changePasswordSchema),
  auditLog('CHANGE_PASSWORD', 'users'),
  AuthController.changePassword
);

export default router;