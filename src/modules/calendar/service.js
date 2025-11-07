import { CalendarEvent } from './model.js';
import { User } from '../auth/model.js';
import { Notification } from '../notifications/model.js';
import { smsService } from '../../utils/sms.js';
import { logger } from '../../utils/logger.js';
import { LogService } from '../logs/service.js';

export class CalendarService {
  /**
   * Create a new calendar event
   */
  static async createEvent(eventData, organizerId) {
    try {
      const event = new CalendarEvent({
        ...eventData,
        organizer: organizerId
      });

      await event.save();
      await event.populate('organizer', 'name email phoneNumber');
      await event.populate('attendees.user', 'name email phoneNumber');

      // Create notifications for attendees
      for (const attendee of event.attendees) {
        await Notification.create({
          type: 'calendar_event',
          title: {
            fa: 'رویداد جدید',
            en: 'New Event'
          },
          message: {
            fa: `رویداد "${event.title}" برای شما ثبت شده است`,
            en: `Event "${event.title}" has been scheduled for you`
          },
          recipient: attendee.user._id,
          relatedEntity: {
            type: 'other',
            id: event._id
          },
          actionUrl: `/dashboard/calendar/${event._id}`
        });
      }

      // Log activity
      await LogService.createActivityLog({
        user: organizerId,
        action: 'CREATE',
        resource: 'calendar',
        resourceId: event._id,
        description: `ایجاد رویداد "${event.title}"`,
        changes: { event: event.toObject() }
      });

      logger.info(`Calendar event created: ${event._id} by ${organizerId}`);
      return event;
    } catch (error) {
      logger.error('Error creating calendar event:', error);
      throw error;
    }
  }

  /**
   * Get events with filters
   */
  static async getEvents(filters = {}, userId = null) {
    try {
      const {
        startDate,
        endDate,
        type,
        organizer,
        search,
        page = 1,
        limit = 50
      } = filters;

      const query = {};

      // If userId is provided, show events where user is organizer or attendee
      if (userId) {
        query.$or = [
          { organizer: userId },
          { 'attendees.user': userId }
        ];
      }

      if (startDate || endDate) {
        query.$or = [
          {
            startDate: {
              $gte: startDate ? new Date(startDate) : new Date(),
              $lte: endDate ? new Date(endDate) : new Date('2100-01-01')
            }
          },
          {
            endDate: {
              $gte: startDate ? new Date(startDate) : new Date(),
              $lte: endDate ? new Date(endDate) : new Date('2100-01-01')
            }
          }
        ];
      }

      if (type) {
        query.type = type;
      }

      if (organizer) {
        query.organizer = organizer;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const parsedLimit = parseInt(limit) || 50;

      const [events, total] = await Promise.all([
        CalendarEvent.find(query)
          .populate('organizer', 'name email phoneNumber')
          .populate('attendees.user', 'name email phoneNumber')
          .sort({ startDate: 1 })
          .skip(skip)
          .limit(parsedLimit)
          .lean(),
        CalendarEvent.countDocuments(query)
      ]);

      return {
        data: events,
        pagination: {
          page: parseInt(page),
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit),
          hasNext: skip + parsedLimit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error getting calendar events:', error);
      throw error;
    }
  }

  /**
   * Get events for a specific date range (for calendar view)
   */
  static async getEventsByDateRange(startDate, endDate, userId = null) {
    try {
      const query = {
        $or: [
          {
            startDate: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          },
          {
            endDate: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          },
          {
            startDate: { $lte: new Date(startDate) },
            endDate: { $gte: new Date(endDate) }
          }
        ]
      };

      if (userId) {
        query.$or = [
          { organizer: userId },
          { 'attendees.user': userId }
        ];
      }

      const events = await CalendarEvent.find(query)
        .populate('organizer', 'name email')
        .populate('attendees.user', 'name email')
        .sort({ startDate: 1 })
        .lean();

      return events;
    } catch (error) {
      logger.error('Error getting events by date range:', error);
      throw error;
    }
  }

  /**
   * Get a single event by ID
   */
  static async getEventById(eventId, userId = null) {
    try {
      const query = { _id: eventId };
      
      if (userId) {
        query.$or = [
          { organizer: userId },
          { 'attendees.user': userId }
        ];
      }

      const event = await CalendarEvent.findOne(query)
        .populate('organizer', 'name email phoneNumber')
        .populate('attendees.user', 'name email phoneNumber');

      if (!event) {
        throw new Error('رویداد یافت نشد');
      }

      return event;
    } catch (error) {
      logger.error('Error getting calendar event:', error);
      throw error;
    }
  }

  /**
   * Update an event
   */
  static async updateEvent(eventId, updateData, userId) {
    try {
      const event = await CalendarEvent.findById(eventId);

      if (!event) {
        throw new Error('رویداد یافت نشد');
      }

      // Check permissions: only organizer or admin can update
      const isOrganizer = event.organizer.toString() === userId;
      
      if (!isOrganizer) {
        const user = await User.findById(userId).populate('role');
        const userRole = user?.role?.name || user?.role;
        if (userRole !== 'super_admin' && userRole !== 'admin') {
          throw new Error('شما دسترسی به این رویداد ندارید');
        }
      }

      const oldData = event.toObject();

      // Update event
      Object.assign(event, updateData);

      await event.save();
      await event.populate('organizer', 'name email phoneNumber');
      await event.populate('attendees.user', 'name email phoneNumber');

      // Notify attendees of changes
      for (const attendee of event.attendees) {
        await Notification.create({
          type: 'calendar_event',
          title: {
            fa: 'رویداد به‌روزرسانی شد',
            en: 'Event Updated'
          },
          message: {
            fa: `رویداد "${event.title}" به‌روزرسانی شد`,
            en: `Event "${event.title}" has been updated`
          },
          recipient: attendee.user._id,
          relatedEntity: {
            type: 'other',
            id: event._id
          },
          actionUrl: `/dashboard/calendar/${event._id}`
        });
      }

      // Log activity
      await LogService.createActivityLog({
        user: userId,
        action: 'UPDATE',
        resource: 'calendar',
        resourceId: event._id,
        description: `ویرایش رویداد "${event.title}"`,
        changes: {
          old: oldData,
          new: event.toObject()
        }
      });

      logger.info(`Calendar event updated: ${eventId} by ${userId}`);
      return event;
    } catch (error) {
      logger.error('Error updating calendar event:', error);
      throw error;
    }
  }

  /**
   * Delete an event
   */
  static async deleteEvent(eventId, userId) {
    try {
      const event = await CalendarEvent.findById(eventId);

      if (!event) {
        throw new Error('رویداد یافت نشد');
      }

      // Check permissions: only organizer or admin can delete
      const isOrganizer = event.organizer.toString() === userId;
      
      if (!isOrganizer) {
        const user = await User.findById(userId).populate('role');
        const userRole = user?.role?.name || user?.role;
        if (userRole !== 'super_admin' && userRole !== 'admin') {
          throw new Error('شما دسترسی به حذف این رویداد ندارید');
        }
      }

      await CalendarEvent.findByIdAndDelete(eventId);

      // Log activity
      await LogService.createActivityLog({
        user: userId,
        action: 'DELETE',
        resource: 'calendar',
        resourceId: eventId,
        description: `حذف رویداد "${event.title}"`
      });

      logger.info(`Calendar event deleted: ${eventId} by ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  /**
   * Respond to event invitation
   */
  static async respondToEvent(eventId, userId, status) {
    try {
      const event = await CalendarEvent.findById(eventId);

      if (!event) {
        throw new Error('رویداد یافت نشد');
      }

      const attendeeIndex = event.attendees.findIndex(
        a => a.user.toString() === userId
      );

      if (attendeeIndex === -1) {
        throw new Error('شما در لیست شرکت‌کنندگان نیستید');
      }

      event.attendees[attendeeIndex].status = status;
      event.attendees[attendeeIndex].respondedAt = new Date();

      await event.save();

      // Notify organizer
      await Notification.create({
        type: 'calendar_event',
        title: {
          fa: 'پاسخ به دعوت',
          en: 'Invitation Response'
        },
        message: {
          fa: `یک شرکت‌کننده به رویداد "${event.title}" پاسخ داد`,
          en: `An attendee responded to event "${event.title}"`
        },
        recipient: event.organizer,
        relatedEntity: {
          type: 'other',
          id: event._id
        },
        actionUrl: `/dashboard/calendar/${event._id}`
      });

      logger.info(`Event response: ${eventId} by ${userId} - ${status}`);
      return event;
    } catch (error) {
      logger.error('Error responding to event:', error);
      throw error;
    }
  }

  /**
   * Send reminders for upcoming events
   */
  static async sendReminders() {
    try {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Find events that need reminders
      const events = await CalendarEvent.find({
        startDate: {
          $gte: now,
          $lte: oneDayLater
        },
        'reminders.sent': false
      })
        .populate('organizer', 'name email phoneNumber')
        .populate('attendees.user', 'name email phoneNumber');

      for (const event of events) {
        for (const reminder of event.reminders) {
          if (reminder.sent) continue;

          const reminderTime = new Date(
            event.startDate.getTime() - reminder.minutesBefore * 60 * 1000
          );

          // Check if it's time to send reminder
          if (reminderTime <= now && reminderTime > new Date(now.getTime() - 5 * 60 * 1000)) {
            // Send dashboard notification
            if (reminder.type === 'dashboard' || reminder.type === 'email') {
              await Notification.create({
                type: 'calendar_event',
                title: {
                  fa: 'یادآوری رویداد',
                  en: 'Event Reminder'
                },
                message: {
                  fa: `یادآوری: رویداد "${event.title}" ${reminder.minutesBefore} دقیقه دیگر شروع می‌شود`,
                  en: `Reminder: Event "${event.title}" starts in ${reminder.minutesBefore} minutes`
                },
                recipient: event.organizer._id,
                relatedEntity: {
                  type: 'other',
                  id: event._id
                },
                actionUrl: `/dashboard/calendar/${event._id}`
              });

              // Send to attendees
              for (const attendee of event.attendees) {
                if (attendee.status === 'accepted' || attendee.status === 'tentative') {
                  await Notification.create({
                    type: 'calendar_event',
                    title: {
                      fa: 'یادآوری رویداد',
                      en: 'Event Reminder'
                    },
                    message: {
                      fa: `یادآوری: رویداد "${event.title}" ${reminder.minutesBefore} دقیقه دیگر شروع می‌شود`,
                      en: `Reminder: Event "${event.title}" starts in ${reminder.minutesBefore} minutes`
                    },
                    recipient: attendee.user._id,
                    relatedEntity: {
                      type: 'other',
                      id: event._id
                    },
                    actionUrl: `/dashboard/calendar/${event._id}`
                  });
                }
              }
            }

            // Send SMS reminder
            if (reminder.type === 'sms') {
              try {
                if (event.organizer.phoneNumber) {
                  const smsMessage = `یادآوری: رویداد "${event.title}" ${reminder.minutesBefore} دقیقه دیگر شروع می‌شود`;
                  await smsService.sendNotification(event.organizer.phoneNumber, smsMessage);
                }

                // Send to attendees
                for (const attendee of event.attendees) {
                  if ((attendee.status === 'accepted' || attendee.status === 'tentative') && attendee.user.phoneNumber) {
                    const smsMessage = `یادآوری: رویداد "${event.title}" ${reminder.minutesBefore} دقیقه دیگر شروع می‌شود`;
                    await smsService.sendNotification(attendee.user.phoneNumber, smsMessage);
                  }
                }
              } catch (smsError) {
                logger.error('Failed to send SMS reminder:', smsError);
              }
            }

            // Mark reminder as sent
            reminder.sent = true;
            reminder.sentAt = new Date();
          }
        }

        await event.save();
      }

      logger.info(`Reminders sent for ${events.length} events`);
      return { sent: events.length };
    } catch (error) {
      logger.error('Error sending reminders:', error);
      throw error;
    }
  }

  /**
   * Get upcoming events for a user
   */
  static async getUpcomingEvents(userId, limit = 10) {
    try {
      const now = new Date();

      const events = await CalendarEvent.find({
        $or: [
          { organizer: userId },
          { 'attendees.user': userId }
        ],
        startDate: { $gte: now }
      })
        .populate('organizer', 'name email')
        .populate('attendees.user', 'name email')
        .sort({ startDate: 1 })
        .limit(limit)
        .lean();

      return events;
    } catch (error) {
      logger.error('Error getting upcoming events:', error);
      throw error;
    }
  }
}

