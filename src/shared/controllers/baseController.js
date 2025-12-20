/**
 * BaseController - Helper functions for common controller operations
 * 
 * این ماژول شامل helper functions برای عملیات مشترک در controllers است:
 * - Standard CRUD operations (create, update, delete, get)
 * - Consistent response formatting
 * - Error handling
 * 
 * @example
 * import { handleCreate, handleUpdate, handleDelete, handleGetList } from '../../shared/controllers/baseController.js';
 * 
 * export class ArticleController {
 *   static async createArticle(req, res, next) {
 *     await handleCreate(
 *       req, res, next,
 *       ArticleService.createArticle,
 *       'article',
 *       'articles.createSuccess'
 *     );
 *   }
 * }
 */

import { logger } from '../../utils/logger.js';

/**
 * Handle create operation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @param {Function} serviceMethod - Service method to call (e.g., ArticleService.createArticle)
 * @param {string} entityName - Entity name for response (e.g., 'article', 'service')
 * @param {string} successMessage - Translation key or message for success
 */
export async function handleCreate(req, res, next, serviceMethod, entityName, successMessage) {
  try {
    const userId = req.user?.id || null;
    const entity = await serviceMethod(req.body, userId);

    res.status(201).json({
      success: true,
      message: req.t ? req.t(successMessage) : successMessage,
      data: { [entityName]: entity }
    });
  } catch (error) {
    logger.error(`Error creating ${entityName}:`, error);
    next(error);
  }
}

/**
 * Handle update operation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @param {Function} serviceMethod - Service method to call
 * @param {string} entityName - Entity name for response
 * @param {string} successMessage - Translation key or message for success
 */
export async function handleUpdate(req, res, next, serviceMethod, entityName, successMessage) {
  try {
    const userId = req.user?.id || null;
    const entity = await serviceMethod(req.params.id, req.body, userId);

    res.json({
      success: true,
      message: req.t ? req.t(successMessage) : successMessage,
      data: { [entityName]: entity }
    });
  } catch (error) {
    logger.error(`Error updating ${entityName}:`, error);
    next(error);
  }
}

/**
 * Handle delete operation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @param {Function} serviceMethod - Service method to call
 * @param {string} entityName - Entity name for response
 * @param {string} successMessage - Translation key or message for success
 */
export async function handleDelete(req, res, next, serviceMethod, entityName, successMessage) {
  try {
    const userId = req.user?.id || null;
    await serviceMethod(req.params.id, userId);

    res.json({
      success: true,
      message: req.t ? req.t(successMessage) : successMessage
    });
  } catch (error) {
    logger.error(`Error deleting ${entityName}:`, error);
    next(error);
  }
}

/**
 * Handle get by ID operation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @param {Function} serviceMethod - Service method to call
 * @param {string} entityName - Entity name for response
 * @param {string} notFoundMessage - Translation key or message for not found
 */
export async function handleGetById(req, res, next, serviceMethod, entityName, notFoundMessage) {
  try {
    const entity = await serviceMethod(req.params.id);

    if (!entity) {
      return res.status(404).json({
        success: false,
        message: req.t ? req.t(notFoundMessage) : notFoundMessage || `${entityName} not found`
      });
    }

    res.json({
      success: true,
      data: { [entityName]: entity }
    });
  } catch (error) {
    logger.error(`Error getting ${entityName}:`, error);
    next(error);
  }
}

/**
 * Handle get list operation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @param {Function} serviceMethod - Service method to call
 */
export async function handleGetList(req, res, next, serviceMethod) {
  try {
    const result = await serviceMethod(req.query);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error getting list:', error);
    next(error);
  }
}

