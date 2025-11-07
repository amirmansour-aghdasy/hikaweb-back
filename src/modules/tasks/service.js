import { Task } from './model.js';
import { User } from '../auth/model.js';
import { Notification } from '../notifications/model.js';
import { smsService } from '../../utils/sms.js';
import { logger } from '../../utils/logger.js';
import { LogService } from '../logs/service.js';

export class TaskService {
  /**
   * Create a new task
   */
  static async createTask(taskData, assignerId) {
    try {
      const task = new Task({
        ...taskData,
        assigner: assignerId
      });

      await task.save();
      await task.populate('assignee', 'name email phoneNumber');
      await task.populate('assigner', 'name email');

      // Create dashboard notification
      if (task.notifications.dashboard) {
        await Notification.create({
          type: 'task_assigned',
          title: {
            fa: 'وظیفه جدید',
            en: 'New Task'
          },
          message: {
            fa: `وظیفه جدید "${task.title}" به شما اختصاص داده شد`,
            en: `New task "${task.title}" has been assigned to you`
          },
          recipient: task.assignee._id,
          relatedEntity: {
            type: 'other',
            id: task._id
          },
          priority: task.priority,
          actionUrl: `/dashboard/tasks/${task._id}`
        });
      }

      // Send SMS notification if enabled
      if (task.notifications.sms && task.assignee.phoneNumber) {
        try {
          const smsMessage = `وظیفه جدید: ${task.title}${task.dueDate ? ` - مهلت: ${new Date(task.dueDate).toLocaleDateString('fa-IR')}` : ''}`;
          await smsService.sendNotification(task.assignee.phoneNumber, smsMessage);
        } catch (smsError) {
          logger.error('Failed to send SMS notification for task:', smsError);
        }
      }

      // Log activity
      await LogService.createActivityLog({
        user: assignerId,
        action: 'CREATE',
        resource: 'tasks',
        resourceId: task._id,
        description: `ایجاد وظیفه "${task.title}" برای ${task.assignee.name}`,
        changes: { task: task.toObject() }
      });

      logger.info(`Task created: ${task._id} by ${assignerId}`);
      return task;
    } catch (error) {
      logger.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Get tasks with filters
   */
  static async getTasks(filters = {}, userId = null) {
    try {
      const {
        assignee,
        assigner,
        status,
        priority,
        search,
        startDate,
        endDate,
        page = 1,
        limit = 25
      } = filters;

      const query = {};

      // If userId is provided, show tasks assigned to or created by that user
      if (userId) {
        query.$or = [
          { assignee: userId },
          { assigner: userId }
        ];
      }

      if (assignee) {
        query.assignee = assignee;
      }

      if (assigner) {
        query.assigner = assigner;
      }

      if (status) {
        query.status = Array.isArray(status) ? { $in: status } : status;
      }

      if (priority) {
        query.priority = priority;
      }

      if (startDate || endDate) {
        query.dueDate = {};
        if (startDate) {
          query.dueDate.$gte = new Date(startDate);
        }
        if (endDate) {
          query.dueDate.$lte = new Date(endDate);
        }
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const parsedLimit = parseInt(limit) || 25;

      const [tasks, total] = await Promise.all([
        Task.find(query)
          .populate('assignee', 'name email phoneNumber')
          .populate('assigner', 'name email')
          .populate('comments.user', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parsedLimit)
          .lean(),
        Task.countDocuments(query)
      ]);

      return {
        data: tasks,
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
      logger.error('Error getting tasks:', error);
      throw error;
    }
  }

  /**
   * Get a single task by ID
   */
  static async getTaskById(taskId, userId = null) {
    try {
      const query = { _id: taskId };
      
      // If userId is provided, ensure user has access to this task
      if (userId) {
        query.$or = [
          { assignee: userId },
          { assigner: userId }
        ];
      }

      const task = await Task.findOne(query)
        .populate('assignee', 'name email phoneNumber')
        .populate('assigner', 'name email')
        .populate('comments.user', 'name email');

      if (!task) {
        throw new Error('وظیفه یافت نشد');
      }

      return task;
    } catch (error) {
      logger.error('Error getting task:', error);
      throw error;
    }
  }

  /**
   * Update a task
   */
  static async updateTask(taskId, updateData, userId) {
    try {
      const task = await Task.findById(taskId);

      if (!task) {
        throw new Error('وظیفه یافت نشد');
      }

      // Check permissions: only assignee, assigner, or admin can update
      const isAssignee = task.assignee.toString() === userId;
      const isAssigner = task.assigner.toString() === userId;
      
      if (!isAssignee && !isAssigner) {
        // Check if user is admin
        const user = await User.findById(userId).populate('role');
        const userRole = user?.role?.name || user?.role;
        if (userRole !== 'super_admin' && userRole !== 'admin') {
          throw new Error('شما دسترسی به این وظیفه ندارید');
        }
      }

      const oldStatus = task.status;
      const oldData = task.toObject();

      // Update task
      Object.assign(task, updateData);

      // Handle status changes
      if (updateData.status === 'completed' && oldStatus !== 'completed') {
        task.completedAt = new Date();
      } else if (updateData.status === 'cancelled' && oldStatus !== 'cancelled') {
        task.cancelledAt = new Date();
      } else if (updateData.status !== 'completed' && updateData.status !== 'cancelled') {
        task.completedAt = undefined;
        task.cancelledAt = undefined;
      }

      await task.save();
      await task.populate('assignee', 'name email phoneNumber');
      await task.populate('assigner', 'name email');

      // Create notification if status changed
      if (updateData.status && updateData.status !== oldStatus) {
        const statusMessages = {
          in_progress: { fa: 'در حال انجام', en: 'In Progress' },
          completed: { fa: 'تکمیل شد', en: 'Completed' },
          cancelled: { fa: 'لغو شد', en: 'Cancelled' }
        };

        if (task.notifications.dashboard) {
          await Notification.create({
            type: 'task_updated',
            title: {
              fa: 'وضعیت وظیفه تغییر کرد',
              en: 'Task Status Changed'
            },
            message: {
              fa: `وضعیت وظیفه "${task.title}" به "${statusMessages[updateData.status]?.fa || updateData.status}" تغییر کرد`,
              en: `Task "${task.title}" status changed to "${statusMessages[updateData.status]?.en || updateData.status}"`
            },
            recipient: task.assignee._id,
            relatedEntity: {
              type: 'other',
              id: task._id
            },
            priority: task.priority,
            actionUrl: `/dashboard/tasks/${task._id}`
          });
        }
      }

      // Log activity
      await LogService.createActivityLog({
        user: userId,
        action: 'UPDATE',
        resource: 'tasks',
        resourceId: task._id,
        description: `ویرایش وظیفه "${task.title}"`,
        changes: {
          old: oldData,
          new: task.toObject()
        }
      });

      logger.info(`Task updated: ${taskId} by ${userId}`);
      return task;
    } catch (error) {
      logger.error('Error updating task:', error);
      throw error;
    }
  }

  /**
   * Delete a task
   */
  static async deleteTask(taskId, userId) {
    try {
      const task = await Task.findById(taskId);

      if (!task) {
        throw new Error('وظیفه یافت نشد');
      }

      // Check permissions: only assigner or admin can delete
      const isAssigner = task.assigner.toString() === userId;
      
      if (!isAssigner) {
        const user = await User.findById(userId).populate('role');
        const userRole = user?.role?.name || user?.role;
        if (userRole !== 'super_admin' && userRole !== 'admin') {
          throw new Error('شما دسترسی به حذف این وظیفه ندارید');
        }
      }

      await Task.findByIdAndDelete(taskId);

      // Log activity
      await LogService.createActivityLog({
        user: userId,
        action: 'DELETE',
        resource: 'tasks',
        resourceId: taskId,
        description: `حذف وظیفه "${task.title}"`
      });

      logger.info(`Task deleted: ${taskId} by ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting task:', error);
      throw error;
    }
  }

  /**
   * Add comment to task
   */
  static async addComment(taskId, userId, content) {
    try {
      const task = await Task.findById(taskId);

      if (!task) {
        throw new Error('وظیفه یافت نشد');
      }

      task.comments.push({
        user: userId,
        content
      });

      await task.save();
      await task.populate('comments.user', 'name email');

      // Notify assignee if comment is from assigner or vice versa
      const commentUser = await User.findById(userId);
      const isAssignee = task.assignee.toString() === userId;
      const isAssigner = task.assigner.toString() === userId;
      const notifyUserId = isAssignee ? task.assigner : task.assignee;

      if (notifyUserId.toString() !== userId) {
        await Notification.create({
          type: 'task_updated',
          title: {
            fa: 'نظر جدید',
            en: 'New Comment'
          },
          message: {
            fa: `${commentUser.name} روی وظیفه "${task.title}" نظر داد`,
            en: `${commentUser.name} commented on task "${task.title}"`
          },
          recipient: notifyUserId,
          relatedEntity: {
            type: 'other',
            id: task._id
          },
          actionUrl: `/dashboard/tasks/${task._id}`
        });
      }

      logger.info(`Comment added to task: ${taskId} by ${userId}`);
      return task;
    } catch (error) {
      logger.error('Error adding comment:', error);
      throw error;
    }
  }

  /**
   * Get task statistics
   */
  static async getTaskStatistics(userId = null) {
    try {
      const query = userId ? {
        $or: [
          { assignee: userId },
          { assigner: userId }
        ]
      } : {};

      const [total, byStatus, byPriority, overdue] = await Promise.all([
        Task.countDocuments(query),
        Task.aggregate([
          { $match: query },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]),
        Task.aggregate([
          { $match: query },
          {
            $group: {
              _id: '$priority',
              count: { $sum: 1 }
            }
          }
        ]),
        Task.countDocuments({
          ...query,
          status: { $ne: 'completed' },
          dueDate: { $lt: new Date() }
        })
      ]);

      return {
        total,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byPriority: byPriority.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        overdue
      };
    } catch (error) {
      logger.error('Error getting task statistics:', error);
      throw error;
    }
  }

  /**
   * Send reminders for tasks with due dates approaching
   */
  static async sendTaskReminders() {
    try {
      const now = new Date();
      const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

      // Find tasks that need reminders
      const tasks = await Task.find({
        status: { $in: ['pending', 'in_progress'] },
        dueDate: {
          $gte: now,
          $lte: oneDayLater
        },
        reminderSent: false,
        'notifications.dashboard': true
      })
        .populate('assignee', 'name email phoneNumber')
        .populate('assigner', 'name email');

      for (const task of tasks) {
        const timeUntilDue = task.dueDate.getTime() - now.getTime();
        const hoursUntilDue = timeUntilDue / (1000 * 60 * 60);

        // Send reminder if due within 24 hours
        if (hoursUntilDue <= 24 && hoursUntilDue > 0) {
          // Dashboard notification
          await Notification.create({
            type: 'task_updated',
            title: {
              fa: 'یادآوری وظیفه',
              en: 'Task Reminder'
            },
            message: {
              fa: `یادآوری: وظیفه "${task.title}" ${Math.round(hoursUntilDue)} ساعت دیگر مهلت دارد`,
              en: `Reminder: Task "${task.title}" is due in ${Math.round(hoursUntilDue)} hours`
            },
            recipient: task.assignee._id,
            relatedEntity: {
              type: 'other',
              id: task._id
            },
            priority: task.priority,
            actionUrl: `/dashboard/tasks/${task._id}`
          });

          // SMS notification if enabled
          if (task.notifications.sms && task.assignee.phoneNumber) {
            try {
              const smsMessage = `یادآوری: وظیفه "${task.title}" ${Math.round(hoursUntilDue)} ساعت دیگر مهلت دارد`;
              await smsService.sendNotification(task.assignee.phoneNumber, smsMessage);
            } catch (smsError) {
              logger.error('Failed to send SMS reminder for task:', smsError);
            }
          }

          // Mark reminder as sent
          task.reminderSent = true;
          await task.save();
        }
      }

      logger.info(`Task reminders sent for ${tasks.length} tasks`);
      return { sent: tasks.length };
    } catch (error) {
      logger.error('Error sending task reminders:', error);
      throw error;
    }
  }
}

