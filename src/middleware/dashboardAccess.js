import { logger } from '../utils/logger.js';

/**
 * Middleware to restrict dashboard access to admin roles only
 * Blocks regular users (role: 'user') from accessing dashboard
 */
export const requireDashboardAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'احراز هویت الزامی است'
    });
  }

  // Allowed roles for dashboard access
  const allowedRoles = ['super_admin', 'admin', 'editor', 'moderator'];
  // Role is stored as string in JWT token (user.role.name from generateTokens)
  const userRole = typeof req.user.role === 'string' 
    ? req.user.role 
    : (req.user.role?.name || req.user.role);

  // Check if user has dashboard access
  if (!allowedRoles.includes(userRole)) {
    logger.warn(`Dashboard access denied for user ${req.user.email} with role ${userRole}`);
    return res.status(403).json({
      success: false,
      message: 'شما دسترسی به پنل مدیریت ندارید'
    });
  }

  next();
};

