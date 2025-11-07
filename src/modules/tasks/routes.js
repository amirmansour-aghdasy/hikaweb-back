import { Router } from 'express';
import { TaskController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate } from '../../middleware/auth.js';
import { auditLog } from '../../middleware/audit.js';
import {
  createTaskSchema,
  updateTaskSchema,
  addCommentSchema
} from './validation.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/',
  validate(createTaskSchema),
  auditLog('CREATE', 'tasks'),
  TaskController.createTask
);

router.get('/',
  auditLog('READ', 'tasks'),
  TaskController.getTasks
);

router.get('/statistics',
  auditLog('READ', 'tasks'),
  TaskController.getStatistics
);

router.get('/:id',
  auditLog('READ', 'tasks'),
  TaskController.getTaskById
);

router.put('/:id',
  validate(updateTaskSchema),
  auditLog('UPDATE', 'tasks'),
  TaskController.updateTask
);

router.delete('/:id',
  auditLog('DELETE', 'tasks'),
  TaskController.deleteTask
);

router.post('/:id/comments',
  validate(addCommentSchema),
  auditLog('UPDATE', 'tasks'),
  TaskController.addComment
);

export default router;

