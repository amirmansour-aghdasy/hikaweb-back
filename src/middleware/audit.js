import { auditLogger } from '../utils/logger.js';
import { baleService } from '../utils/bale.js';
import { LogService } from '../modules/logs/service.js';

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

      // Log to winston (file-based)
      auditLogger.info('Audit Log', auditData);

      // Log to MongoDB (Activity Log) if user is authenticated
      if (req.user && req.user.id) {
        // Map HTTP methods to action types
        let logAction = action;
        if (!logAction) {
          switch (req.method) {
            case 'POST':
              logAction = 'CREATE';
              break;
            case 'GET':
              logAction = 'READ';
              break;
            case 'PUT':
            case 'PATCH':
              logAction = 'UPDATE';
              break;
            case 'DELETE':
              logAction = 'DELETE';
              break;
            default:
              logAction = 'READ';
          }
        } else {
          // Normalize action names to match enum values
          // Convert CREATE_TICKET, CREATE_BRAND, etc. to CREATE
          if (logAction.startsWith('CREATE_')) {
            logAction = 'CREATE';
          } else if (logAction.startsWith('UPDATE_')) {
            logAction = 'UPDATE';
          } else if (logAction.startsWith('DELETE_')) {
            logAction = 'DELETE';
          } else if (logAction.startsWith('READ_')) {
            logAction = 'READ';
          } else if (logAction === 'UPLOAD_MEDIA' || logAction === 'BULK_UPLOAD_MEDIA') {
            logAction = 'FILE_UPLOAD';
          }
          // Keep other actions as-is (LOGIN, LOGOUT, etc.)
        }

        // Extract changes from request body if available
        let changes = {};
        if (req.method === 'PUT' || req.method === 'PATCH') {
          changes = req.body || {};
        }

        // Create activity log in MongoDB
        LogService.createActivityLog({
          user: req.user.id,
          action: logAction,
          resource: resource || req.originalUrl.split('/')[2] || 'unknown',
          resourceId: req.params.id || req.body?.id || null,
          description: `${logAction} ${resource || req.originalUrl}`,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          changes,
          metadata: {
            query: req.query,
            params: req.params
          }
        }).catch(err => {
          // Don't break the request if logging fails
          auditLogger.error('Failed to create activity log:', err);
        });
      }

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