import { Router } from 'express';
import { UserController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import { createUserSchema, updateUserSchema } from './validation.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get roles (for dropdowns)
router.get('/roles', authorize(['users.read', 'roles.read']), UserController.getRoles);

// CRUD operations
router.post(
  '/',
  authorize(['users.create']),
  validate(createUserSchema),
  auditLog('CREATE_USER', 'users'),
  UserController.createUser
);

router.get('/', authorize(['users.read']), UserController.getUsers);

router.get('/:id', authorize(['users.read']), UserController.getUserById);

router.put(
  '/:id',
  authorize(['users.update']),
  validate(updateUserSchema),
  auditLog('UPDATE_USER', 'users'),
  UserController.updateUser
);

router.delete(
  '/:id',
  authorize(['users.delete']),
  auditLog('DELETE_USER', 'users'),
  UserController.deleteUser
);

export default router;
