import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '@simplewebauthn/server';
import { WebAuthnCredential } from './webauthnModel.js';
import { User } from './model.js';
import { config } from '../../config/environment.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/appError.js';
import { HTTP_STATUS } from '../../utils/httpStatus.js';

// Get Relying Party (RP) configuration
const rpID = process.env.WEBAUTHN_RP_ID || (config.NODE_ENV === 'production' 
  ? 'hikaweb.ir' 
  : 'localhost');

const rpName = process.env.WEBAUTHN_RP_NAME || 'هیکاوب';

const origin = process.env.WEBAUTHN_ORIGIN || (config.NODE_ENV === 'production'
  ? 'https://dashboard.hikaweb.ir'
  : 'http://localhost:3000');

export class WebAuthnService {
  /**
   * Generate registration options for a user
   */
  static async generateRegistrationOptions(userId, deviceName = null) {
    try {
      const user = await User.findById(userId).populate('role');
      if (!user) {
        throw new AppError('کاربر یافت نشد', HTTP_STATUS.NOT_FOUND);
      }

      // Check if user has dashboard access
      const userRole = user.role?.name || user.role;
      const allowedRoles = ['super_admin', 'admin', 'editor', 'moderator'];
      if (!allowedRoles.includes(userRole)) {
        throw new AppError('فقط کاربران Dashboard می‌توانند بایومتریک را فعال کنند', HTTP_STATUS.FORBIDDEN);
      }

      // Get existing credentials for this user
      const existingCredentials = await WebAuthnCredential.find({
        user: userId,
        isActive: true
      });

      // Convert userID to Buffer (required by SimpleWebAuthn v9+)
      const userIDBuffer = Buffer.from(userId.toString(), 'utf8');
      
      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: userIDBuffer,
        userName: user.email,
        userDisplayName: user.name,
        // Prevent users from re-registering existing authenticators
        excludeCredentials: existingCredentials.map(cred => {
          // Convert base64 credentialID back to Buffer
          const credentialIDBuffer = Buffer.from(cred.credentialID, 'base64');
          return {
            id: credentialIDBuffer,
            type: 'public-key',
            transports: ['internal', 'hybrid']
          };
        }),
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Prefer platform authenticators (fingerprint, face)
          userVerification: 'preferred',
          requireResidentKey: false
        },
        supportedAlgorithmIDs: [-7, -257] // ES256 and RS256
      });

      // Store challenge in Redis (we'll use a simple in-memory store for now)
      // In production, use Redis
      const challenge = options.challenge;
      
      // Store challenge temporarily (expires in 5 minutes)
      if (global.webauthnChallenges) {
        global.webauthnChallenges[userId.toString()] = {
          challenge,
          type: 'registration',
          expiresAt: Date.now() + 5 * 60 * 1000
        };
      } else {
        global.webauthnChallenges = {
          [userId.toString()]: {
            challenge,
            type: 'registration',
            expiresAt: Date.now() + 5 * 60 * 1000
          }
        };
      }

      return options;
    } catch (error) {
      logger.error('Error generating registration options:', error);
      throw error;
    }
  }

  /**
   * Verify registration response and save credential
   */
  static async verifyRegistration(userId, response, deviceName = null) {
    try {
      // Get stored challenge
      const storedChallenge = global.webauthnChallenges?.[userId.toString()];
      if (!storedChallenge || storedChallenge.type !== 'registration') {
        throw new AppError('Challenge یافت نشد یا منقضی شده است', HTTP_STATUS.BAD_REQUEST);
      }

      if (Date.now() > storedChallenge.expiresAt) {
        delete global.webauthnChallenges[userId.toString()];
        throw new AppError('Challenge منقضی شده است', HTTP_STATUS.BAD_REQUEST);
      }

      const user = await User.findById(userId).populate('role');
      if (!user) {
        throw new AppError('کاربر یافت نشد', HTTP_STATUS.NOT_FOUND);
      }

      // Verify registration
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: storedChallenge.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true
      });

      if (!verification.verified) {
        throw new AppError('تایید ثبت‌نام ناموفق بود', HTTP_STATUS.BAD_REQUEST);
      }

      // Save credential
      // credentialPublicKey is a Buffer, convert to base64 for storage
      const publicKeyBase64 = Buffer.from(verification.registrationInfo.credentialPublicKey).toString('base64');
      
      const credential = new WebAuthnCredential({
        user: userId,
        credentialID: Buffer.from(verification.registrationInfo.credentialID).toString('base64'),
        publicKey: publicKeyBase64,
        counter: verification.registrationInfo.counter,
        deviceName: deviceName || this.detectDeviceName(response),
        deviceType: this.detectDeviceType(response),
        authenticatorType: this.detectAuthenticatorType(response)
      });

      await credential.save();

      // Clean up challenge
      delete global.webauthnChallenges[userId.toString()];

      logger.info(`WebAuthn credential registered for user ${userId}`);

      return {
        verified: true,
        credential: {
          id: credential._id,
          deviceName: credential.deviceName,
          deviceType: credential.deviceType,
          authenticatorType: credential.authenticatorType,
          registeredAt: credential.registeredAt
        }
      };
    } catch (error) {
      logger.error('Error verifying registration:', error);
      throw error;
    }
  }

  /**
   * Generate authentication options
   */
  static async generateAuthenticationOptions(userEmail) {
    try {
      const user = await User.findOne({ email: userEmail }).populate('role');
      if (!user) {
        // Don't reveal if user exists
        throw new AppError('اطلاعات ورود نادرست است', HTTP_STATUS.UNAUTHORIZED);
      }

      // Check if user has dashboard access
      const userRole = user.role?.name || user.role;
      const allowedRoles = ['super_admin', 'admin', 'editor', 'moderator'];
      if (!allowedRoles.includes(userRole)) {
        throw new AppError('اطلاعات ورود نادرست است', HTTP_STATUS.UNAUTHORIZED);
      }

      // Get user's active credentials
      const credentials = await WebAuthnCredential.find({
        user: user._id,
        isActive: true
      });

      if (credentials.length === 0) {
        throw new AppError('هیچ credential بایومتریک ثبت نشده است', HTTP_STATUS.BAD_REQUEST);
      }

      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: credentials.map(cred => {
          // Convert base64 credentialID back to Buffer
          const credentialIDBuffer = Buffer.from(cred.credentialID, 'base64');
          return {
            id: credentialIDBuffer,
            type: 'public-key',
            transports: ['internal', 'hybrid']
          };
        }),
        userVerification: 'preferred'
      });

      // Store challenge
      if (!global.webauthnChallenges) {
        global.webauthnChallenges = {};
      }
      
      global.webauthnChallenges[userEmail] = {
        challenge: options.challenge,
        type: 'authentication',
        userId: user._id.toString(),
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
      };

      return options;
    } catch (error) {
      logger.error('Error generating authentication options:', error);
      throw error;
    }
  }

  /**
   * Verify authentication response
   */
  static async verifyAuthentication(userEmail, response) {
    try {
      // Get stored challenge
      const storedChallenge = global.webauthnChallenges?.[userEmail];
      if (!storedChallenge || storedChallenge.type !== 'authentication') {
        throw new AppError('Challenge یافت نشد یا منقضی شده است', HTTP_STATUS.BAD_REQUEST);
      }

      if (Date.now() > storedChallenge.expiresAt) {
        delete global.webauthnChallenges[userEmail];
        throw new AppError('Challenge منقضی شده است', HTTP_STATUS.BAD_REQUEST);
      }

      const user = await User.findById(storedChallenge.userId).populate('role');
      if (!user) {
        throw new AppError('کاربر یافت نشد', HTTP_STATUS.NOT_FOUND);
      }

      // Convert response.id (base64url) to base64 for comparison
      const responseIdBase64 = Buffer.from(response.id, 'base64url').toString('base64');
      
      // Get credential
      const credential = await WebAuthnCredential.findOne({
        credentialID: responseIdBase64,
        user: user._id,
        isActive: true
      });

      if (!credential) {
        throw new AppError('Credential یافت نشد', HTTP_STATUS.BAD_REQUEST);
      }

      // Convert stored base64 values back to Buffer
      const credentialIDBuffer = Buffer.from(credential.credentialID, 'base64');
      const publicKeyBuffer = Buffer.from(credential.publicKey, 'base64');

      // Verify authentication
      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: storedChallenge.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: credentialIDBuffer,
          publicKey: publicKeyBuffer,
          counter: credential.counter
        },
        requireUserVerification: true
      });

      if (!verification.verified) {
        throw new AppError('تایید احراز هویت ناموفق بود', HTTP_STATUS.UNAUTHORIZED);
      }

      // Update counter
      await credential.updateCounter(verification.authenticationInfo.newCounter);

      // Update user last login
      user.lastLogin = new Date();
      await user.save();

      // Clean up challenge
      delete global.webauthnChallenges[userEmail];

      logger.info(`WebAuthn authentication successful for user ${user._id}`);

      return {
        verified: true,
        user
      };
    } catch (error) {
      logger.error('Error verifying authentication:', error);
      throw error;
    }
  }

  /**
   * Get user's credentials
   */
  static async getUserCredentials(userId) {
    try {
      const credentials = await WebAuthnCredential.find({
        user: userId,
        isActive: true
      }).sort({ lastUsed: -1 });

      return credentials.map(cred => ({
        id: cred._id,
        deviceName: cred.deviceName,
        deviceType: cred.deviceType,
        authenticatorType: cred.authenticatorType,
        lastUsed: cred.lastUsed,
        registeredAt: cred.registeredAt
      }));
    } catch (error) {
      logger.error('Error getting user credentials:', error);
      throw error;
    }
  }

  /**
   * Delete a credential
   */
  static async deleteCredential(userId, credentialId) {
    try {
      const credential = await WebAuthnCredential.findOne({
        _id: credentialId,
        user: userId
      });

      if (!credential) {
        throw new AppError('Credential یافت نشد', HTTP_STATUS.NOT_FOUND);
      }

      await credential.deactivate();

      logger.info(`WebAuthn credential ${credentialId} deleted for user ${userId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error deleting credential:', error);
      throw error;
    }
  }

  /**
   * Detect device name from response
   */
  static detectDeviceName(response) {
    // Try to extract device info from response
    if (response.response?.clientExtensionResults) {
      // Could extract more info here
    }
    return 'Unknown Device';
  }

  /**
   * Detect device type from response
   */
  static detectDeviceType(response) {
    // This is a simplified detection
    // In production, you might want to use User-Agent or other methods
    return 'unknown';
  }

  /**
   * Detect authenticator type from response
   */
  static detectAuthenticatorType(response) {
    // Check authenticator attachment
    if (response.response?.authenticatorAttachment === 'platform') {
      return 'platform'; // Fingerprint, Face ID, etc.
    }
    return 'unknown';
  }
}

