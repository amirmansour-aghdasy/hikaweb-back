import { Router } from 'express';
import { TeamController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import { sanitizeHTML } from '../../middleware/validation.js';
import { createTeamMemberSchema, updateTeamMemberSchema } from './validation.js';

const router = Router();

// Public routes
router.get('/public', TeamController.getPublicTeamMembers);
router.get('/slug/:slug', TeamController.getTeamMemberBySlug);

// Protected routes
router.use(authenticate);

router.post(
  '/',
  authorize(['team.create']),
  validate(createTeamMemberSchema),
  sanitizeHTML(['bio.fa', 'bio.en']),
  auditLog('CREATE_TEAM_MEMBER', 'team'),
  TeamController.createTeamMember
);

router.get('/', authorize(['team.read']), TeamController.getTeamMembers);

router.get('/:id', authorize(['team.read']), TeamController.getTeamMemberById);

router.put(
  '/:id',
  authorize(['team.update']),
  validate(updateTeamMemberSchema),
  sanitizeHTML(['bio.fa', 'bio.en']),
  auditLog('UPDATE_TEAM_MEMBER', 'team'),
  TeamController.updateTeamMember
);

router.delete(
  '/:id',
  authorize(['team.delete']),
  auditLog('DELETE_TEAM_MEMBER', 'team'),
  TeamController.deleteTeamMember
);

export default router;
