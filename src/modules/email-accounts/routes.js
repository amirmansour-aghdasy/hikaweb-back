import { Router } from 'express';
import { EmailAccountsController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import {
  createEmailAccountSchema,
  updateEmailAccountSchema,
  sendEmailSchema
} from './validation.js';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

router.get('/', EmailAccountsController.list);
router.get('/sent', EmailAccountsController.listSent);
router.post('/send', validate(sendEmailSchema), EmailAccountsController.send);
router.post('/', validate(createEmailAccountSchema), EmailAccountsController.create);
router.get('/:id/inbox', EmailAccountsController.getInbox);
router.get('/:id/inbox/:uid', EmailAccountsController.getInboxMessage);
router.get('/:id', EmailAccountsController.getById);
router.put('/:id', validate(updateEmailAccountSchema), EmailAccountsController.update);
router.delete('/:id', EmailAccountsController.remove);
router.post('/:id/send', validate(sendEmailSchema), EmailAccountsController.send);

export default router;
