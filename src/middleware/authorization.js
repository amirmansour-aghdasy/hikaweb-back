import { logger } from '../utils/logger.js';

export const authorize = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: req.t('auth.authenticationRequired')
      });
    }

    const userPermissions = req.user.permissions || [];
    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

    // Super admin bypass
    if (req.user.role === 'super_admin') {
      return next();
    }

    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      logger.warn(`Access denied for ${req.user.email} to ${req.originalUrl}`);
      return res.status(403).json({
        success: false,
        message: req.t('auth.insufficientPermissions')
      });
    }

    next();
  };
};