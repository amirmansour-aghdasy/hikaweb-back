import { Router } from 'express';
import { AuthController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
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
  updateProfileSchema,
  verifyPhoneNumberOTPSchema,
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

// Frontend-compatible route aliases
router.post('/send-otp',
  otpLimiter,
  validate(otpRequestSchema),
  auditLog('OTP_REQUEST', 'users'),
  AuthController.sendOTPAlias
);

router.post('/verify-otp',
  authLimiter,
  validate(otpVerifySchema),
  auditLog('OTP_VERIFY', 'users'),
  AuthController.verifyOTPAlias
);

// Check if user exists
router.post('/check-user',
  authLimiter,
  AuthController.checkUser
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

// WebAuthn public routes (authentication)
router.post('/webauthn/authenticate/options',
  authLimiter,
  AuthController.getWebAuthnAuthenticationOptions
);

router.post('/webauthn/authenticate',
  authLimiter,
  auditLog('WEBAUTHN_AUTHENTICATE', 'users'),
  AuthController.authenticateWebAuthn
);

// Logout route - authenticate is optional (for cleanup even if token is invalid)
// Must be before router.use(authenticate) to use optionalAuth
router.post('/logout',
  optionalAuth, // Try to authenticate, but don't fail if token is missing/invalid
  auditLog('LOGOUT', 'users'),
  AuthController.logout
);

// Protected routes
router.use(authenticate);

router.get('/csrf-token',
  AuthController.getCsrfToken
);

router.get('/me',
  AuthController.me
);

router.put('/change-password',
  validate(changePasswordSchema),
  auditLog('CHANGE_PASSWORD', 'users'),
  AuthController.changePassword
);

// Profile update route - accessible to all authenticated users (frontend)
router.put('/profile',
  validate(updateProfileSchema),
  auditLog('UPDATE_PROFILE', 'users'),
  AuthController.updateProfile
);

// Verify phone number OTP and update phone number
router.post('/profile/verify-phone',
  authenticate,
  validate(verifyPhoneNumberOTPSchema),
  auditLog('VERIFY_PHONE_OTP', 'users'),
  AuthController.verifyPhoneNumberOTP
);

// Dashboard-only profile update route (for backward compatibility)
router.put('/dashboard/profile',
  requireDashboardAccess,
  validate(updateProfileSchema),
  auditLog('UPDATE_PROFILE', 'users'),
  AuthController.updateProfile
);

router.get('/sessions',
  requireDashboardAccess,
  AuthController.getSessions
);

router.delete('/sessions/:id',
  requireDashboardAccess,
  auditLog('REVOKE_SESSION', 'users'),
  AuthController.revokeSession
);

router.delete('/sessions',
  requireDashboardAccess,
  auditLog('REVOKE_ALL_SESSIONS', 'users'),
  AuthController.revokeAllSessions
);

router.get('/activity',
  requireDashboardAccess,
  AuthController.getActivityHistory
);

// WebAuthn protected routes (registration and management)
router.post('/webauthn/register/options',
  requireDashboardAccess,
  auditLog('WEBAUTHN_REGISTER_OPTIONS', 'users'),
  AuthController.getWebAuthnRegistrationOptions
);

router.post('/webauthn/register',
  requireDashboardAccess,
  auditLog('WEBAUTHN_REGISTER', 'users'),
  AuthController.registerWebAuthn
);

router.get('/webauthn/credentials',
  requireDashboardAccess,
  AuthController.getWebAuthnCredentials
);

router.delete('/webauthn/credentials/:id',
  requireDashboardAccess,
  auditLog('WEBAUTHN_DELETE_CREDENTIAL', 'users'),
  AuthController.deleteWebAuthnCredential
);

export default router;