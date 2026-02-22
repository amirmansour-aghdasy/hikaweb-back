import { ChatService } from './service.js';
import { logger } from '../../utils/logger.js';

export class ChatController {
  static async listRooms(req, res, next) {
    try {
      const rooms = await ChatService.listRooms();
      res.json({ success: true, data: { rooms } });
    } catch (error) {
      next(error);
    }
  }

  static async getRoom(req, res, next) {
    try {
      const { id } = req.params;
      const room = await ChatService.getRoomById(id);
      if (!room) {
        return res.status(404).json({ success: false, message: req.t?.('notFound') || 'اتاق یافت نشد' });
      }
      res.json({ success: true, data: { room } });
    } catch (error) {
      next(error);
    }
  }

  static async createRoom(req, res, next) {
    try {
      const room = await ChatService.createRoom(req.body, req.user.id);
      res.status(201).json({ success: true, data: { room } });
    } catch (error) {
      next(error);
    }
  }

  static async listMessages(req, res, next) {
    try {
      const { id: roomId } = req.params;
      const room = await ChatService.getRoomById(roomId);
      if (!room) {
        return res.status(404).json({ success: false, message: req.t?.('notFound') || 'اتاق یافت نشد' });
      }
      const { page, limit, before } = req.query;
      const messages = await ChatService.listMessages(roomId, { page, limit, before });
      res.json({ success: true, data: { messages, room } });
    } catch (error) {
      next(error);
    }
  }
}
