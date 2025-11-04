import { Router } from 'express';
import { RoleController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import { createRoleSchema, updateRoleSchema } from './validation.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// CRUD operations
router.post(
  '/',
  authorize(['roles.create', 'admin.all']),
  validate(createRoleSchema),
  auditLog('CREATE_ROLE', 'roles'),
  RoleController.createRole
);

router.get('/', authorize(['roles.read', 'admin.all']), RoleController.getRoles);

router.get('/:id', authorize(['roles.read', 'admin.all']), RoleController.getRoleById);

router.put(
  '/:id',
  authorize(['roles.update', 'admin.all']),
  validate(updateRoleSchema),
  auditLog('UPDATE_ROLE', 'roles'),
  RoleController.updateRole
);

router.delete(
  '/:id',
  authorize(['roles.delete', 'admin.all']),
  auditLog('DELETE_ROLE', 'roles'),
  RoleController.deleteRole
);

export default router;

