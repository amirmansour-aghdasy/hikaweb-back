import { Router } from 'express';
import { CategoryController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import { createCategorySchema, updateCategorySchema } from './validation.js';

const router = Router();

// Public routes
router.get('/', optionalAuth, CategoryController.getCategories);
router.get('/tree/:type', optionalAuth, CategoryController.getCategoryTree);

// Protected routes
router.use(authenticate);

router.post(
  '/',
  authorize(['categories.create']),
  validate(createCategorySchema),
  auditLog('CREATE_CATEGORY', 'categories'),
  CategoryController.createCategory
);

router.get('/:id', authorize(['categories.read']), CategoryController.getCategoryById);

router.put(
  '/:id',
  authorize(['categories.update']),
  validate(updateCategorySchema),
  auditLog('UPDATE_CATEGORY', 'categories'),
  CategoryController.updateCategory
);

router.delete(
  '/:id',
  authorize(['categories.delete']),
  auditLog('DELETE_CATEGORY', 'categories'),
  CategoryController.deleteCategory
);

export default router;
