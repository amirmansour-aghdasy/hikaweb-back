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
// POST /tickets - Allow any authenticated user to create tickets (frontend access)
// Dashboard access requires tickets.create permission (handled in controller if needed)
router.post(
  '/',
  validate(createTicketSchema),
  auditLog('CREATE_TICKET', 'tickets'),
  TicketController.createTicket
);

// GET /tickets - Allow any authenticated user to read their own tickets (frontend access)
// Controller handles filtering to show only user's own tickets for non-admin users
router.get(
  '/',
  TicketController.getTickets
);

// GET /tickets/:id - Allow any authenticated user to read their own tickets (frontend access)
// Controller handles permission check
router.get('/:id', TicketController.getTicketById);

router.put(
  '/:id',
  authorize(['tickets.update', 'tickets.create']), // Customers can update their own tickets
  validate(updateTicketSchema),
  auditLog('UPDATE_TICKET', 'tickets'),
  TicketController.updateTicket
);

// POST /tickets/:id/messages - Allow any authenticated user to add messages to their own tickets (frontend access)
// Controller handles permission check
router.post(
  '/:id/messages',
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
