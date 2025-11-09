import { Router } from 'express';
import { CalendarController } from './controller.js';
import { validate } from '../../middleware/validation.js';
import { authenticate } from '../../middleware/auth.js';
import { auditLog } from '../../middleware/audit.js';
import {
  createEventSchema,
  updateEventSchema,
  respondToEventSchema
} from './validation.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/',
  validate(createEventSchema),
  auditLog('CREATE', 'calendar'),
  CalendarController.createEvent
);

router.get('/',
  auditLog('READ', 'calendar'),
  CalendarController.getEvents
);

router.get('/range',
  auditLog('READ', 'calendar'),
  CalendarController.getEventsByDateRange
);

router.get('/upcoming',
  auditLog('READ', 'calendar'),
  CalendarController.getUpcomingEvents
);

router.get('/statistics',
  auditLog('READ', 'calendar'),
  CalendarController.getStatistics
);

router.get('/:id',
  auditLog('READ', 'calendar'),
  CalendarController.getEventById
);

router.put('/:id',
  validate(updateEventSchema),
  auditLog('UPDATE', 'calendar'),
  CalendarController.updateEvent
);

router.delete('/:id',
  auditLog('DELETE', 'calendar'),
  CalendarController.deleteEvent
);

router.post('/:id/respond',
  validate(respondToEventSchema),
  auditLog('UPDATE', 'calendar'),
  CalendarController.respondToEvent
);

router.post('/reminders/send',
  auditLog('UPDATE', 'calendar'),
  CalendarController.sendReminders
);

export default router;

