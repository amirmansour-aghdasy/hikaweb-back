import { auditLogger } from '../utils/logger.js';
import { baleService } from '../utils/bale.js';

export const auditLog = (action, resource) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      const auditData = {
        action,
        resource,
        user: req.user,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        timestamp: new Date(),
        statusCode: res.statusCode
      };

      auditLogger.info('Audit Log', auditData);

      // Notify critical actions
      const criticalActions = ['DELETE', 'CREATE_USER', 'UPDATE_ROLE'];
      if (criticalActions.includes(action)) {
        // Format audit data for Bale notification
        const formattedAuditData = {
          action,
          resource,
          user: req.user?.email || req.user?.name || 'Unknown',
          details: `${req.method} ${req.originalUrl}`,
          timestamp: new Date().toLocaleString('fa-IR')
        };
        
        // Use sendAuditLog instead of sendAuditNotification
        baleService.sendAuditLog(formattedAuditData).catch(err => {
          auditLogger.error('Failed to send audit notification to Bale:', err);
        });
      }

      originalSend.call(this, data);
    };

    next();
  };
};