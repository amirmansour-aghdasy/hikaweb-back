import { Router } from 'express';
import { CommentController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import { sanitizeHTML } from '../../middleware/validation.js';
import { createCommentSchema, updateCommentSchema, moderateCommentSchema } from './validation.js';

const router = Router();

// Public routes
router.get('/:referenceType/:referenceId', CommentController.getCommentsByReference);

// Semi-protected routes (optional authentication)
router.post(
  '/',
  optionalAuth,
  validate(createCommentSchema),
  sanitizeHTML(['content']),
  auditLog('CREATE_COMMENT', 'comment'),
  CommentController.createComment
);

// Protected routes
router.use(authenticate);

router.get('/', authorize(['comments.read']), CommentController.getComments);
router.get('/pending', authorize(['comments.moderate']), CommentController.getPendingComments);
router.get('/:id', authorize(['comments.read']), CommentController.getCommentById);

router.put(
  '/:id',
  validate(updateCommentSchema),
  sanitizeHTML(['content']),
  auditLog('UPDATE_COMMENT', 'comment'),
  CommentController.updateComment
);

router.patch(
  '/:id/moderate',
  authorize(['comments.moderate']),
  validate(moderateCommentSchema),
  auditLog('MODERATE_COMMENT', 'comment'),
  CommentController.moderateComment
);

router.delete(
  '/:id',
  authorize(['comments.delete']),
  auditLog('DELETE_COMMENT', 'comment'),
  CommentController.deleteComment
);

export default router;
