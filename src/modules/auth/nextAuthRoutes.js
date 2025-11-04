import { Router } from 'express';
import { AuthController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';

/**
 * NextAuth-compatible routes for Next.js frontend integration
 * These endpoints follow NextAuth.js API conventions
 */
const router = Router();

/**
 * GET /api/auth/providers
 * Get available authentication providers
 */
router.get('/providers', (req, res) => {
  res.json({
    google: {
      id: 'google',
      name: 'Google',
      type: 'oauth',
      signinUrl: '/api/auth/signin/google',
      callbackUrl: '/api/auth/callback/google'
    },
    credentials: {
      id: 'credentials',
      name: 'Credentials',
      type: 'credentials'
    },
    sms: {
      id: 'sms',
      name: 'SMS OTP',
      type: 'sms'
    }
  });
});

/**
 * GET /api/auth/session
 * Get current session (NextAuth compatible)
 */
router.get('/session', optionalAuth, AuthController.getSession);

/**
 * POST /api/auth/signin/:provider
 * Sign in with provider (NextAuth compatible)
 */
router.post('/signin/:provider', AuthController.nextAuthSignIn);

/**
 * POST /api/auth/callback/:provider
 * OAuth callback handler (NextAuth compatible)
 */
router.post('/callback/:provider', AuthController.nextAuthCallback);

/**
 * POST /api/auth/signout
 * Sign out (NextAuth compatible)
 */
router.post('/signout', authenticate, AuthController.nextAuthSignOut);

export default router;

