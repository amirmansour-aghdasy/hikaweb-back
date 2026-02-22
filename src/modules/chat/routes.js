import { Router } from 'express';
import { ChatController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate } from '../../middleware/auth.js';
import {
  createRoomSchema,
  listMessagesQuerySchema
} from './validation.js';

const router = Router();

router.use(authenticate);

router.get('/rooms', ChatController.listRooms);
router.post('/rooms', validate(createRoomSchema), ChatController.createRoom);
router.get('/rooms/:id', ChatController.getRoom);
router.get('/rooms/:id/messages', validate(listMessagesQuerySchema, 'query'), ChatController.listMessages);

export default router;
