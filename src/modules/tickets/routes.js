import { Router } from 'express';
import { TicketController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorization.js';
import { auditLog } from '../../middleware/audit.js';
import {
  createTicketSchema,
  updateTicketSchema,
  addMessageSchema,
  assignTicketSchema,
  closeTicketSchema
} from './validation.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Customer and admin routes
router.post(
  '/',
  authorize(['tickets.create']),
  validate(createTicketSchema),
  auditLog('CREATE_TICKET', 'tickets'),
  TicketController.createTicket
);

router.get(
  '/',
  authorize(['tickets.read', 'tickets.create']), // Customers can read their own tickets
  TicketController.getTickets
);

router.get('/:id', authorize(['tickets.read', 'tickets.create']), TicketController.getTicketById);

router.put(
  '/:id',
  authorize(['tickets.update', 'tickets.create']), // Customers can update their own tickets
  validate(updateTicketSchema),
  auditLog('UPDATE_TICKET', 'tickets'),
  TicketController.updateTicket
);

router.post(
  '/:id/messages',
  authorize(['tickets.read', 'tickets.create']),
  validate(addMessageSchema),
  auditLog('ADD_TICKET_MESSAGE', 'tickets'),
  TicketController.addMessage
);

// Admin only routes
router.get(
  '/stats/overview',
  authorize(['tickets.read', 'admin.all']),
  TicketController.getTicketStats
);

router.patch(
  '/:id/assign',
  authorize(['tickets.assign', 'admin.all']),
  validate(assignTicketSchema),
  auditLog('ASSIGN_TICKET', 'tickets'),
  TicketController.assignTicket
);

router.patch(
  '/:id/close',
  authorize(['tickets.update', 'admin.all']),
  validate(closeTicketSchema),
  auditLog('CLOSE_TICKET', 'tickets'),
  TicketController.closeTicket
);

router.delete(
  '/:id',
  authorize(['tickets.delete', 'admin.all']),
  auditLog('DELETE_TICKET', 'tickets'),
  TicketController.deleteTicket
);

export default router;
