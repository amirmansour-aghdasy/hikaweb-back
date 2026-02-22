import jwt from 'jsonwebtoken';
import { config } from '../../config/environment.js';
import { logger } from '../../utils/logger.js';
import { ChatService } from './service.js';
import { User } from '../auth/model.js';

const ROOM_PREFIX = 'chat:room:';

const roomMembers = new Map();
const socketRooms = new Map();

async function getRoomMembersList(roomId) {
  const socketMap = roomMembers.get(String(roomId));
  if (!socketMap || socketMap.size === 0) return [];
  const userIds = [...new Set(socketMap.values())];
  const users = await User.find({ _id: { $in: userIds } })
    .select('name email')
    .lean();
  return users.map((u) => ({ _id: u._id.toString(), name: u.name, email: u.email || '' }));
}

async function broadcastRoomMembers(io, roomId) {
  const roomName = `${ROOM_PREFIX}${roomId}`;
  const members = await getRoomMembersList(roomId);
  io.to(roomName).emit('chat:room_members', { roomId, members });
}

function removeSocketFromRoom(io, socketId, roomId) {
  const rId = String(roomId);
  const map = roomMembers.get(rId);
  if (map) {
    map.delete(socketId);
    if (map.size === 0) roomMembers.delete(rId);
    broadcastRoomMembers(io, rId).catch((e) => logger.error('broadcastRoomMembers error', e));
  }
  const rooms = socketRooms.get(socketId);
  if (rooms) rooms.delete(rId);
}

export function initChatSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('توکن الزامی است'));
      }
      const decoded = jwt.verify(token, config.JWT_SECRET);
      socket.data.userId = decoded.id;
      socket.data.userEmail = decoded.email;
      next();
    } catch (err) {
      next(new Error('توکن نامعتبر است'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;

    socket.on('chat:join', async (roomId, cb) => {
      try {
        const rId = String(roomId);
        const canAccess = await ChatService.userCanAccessRoom(roomId, userId);
        if (!canAccess) {
          if (typeof cb === 'function') cb({ ok: false, error: 'دسترسی غیرمجاز' });
          return;
        }
        const roomName = `${ROOM_PREFIX}${rId}`;
        await socket.join(roomName);
        if (!roomMembers.has(rId)) roomMembers.set(rId, new Map());
        roomMembers.get(rId).set(socket.id, userId);
        if (!socketRooms.has(socket.id)) socketRooms.set(socket.id, new Set());
        socketRooms.get(socket.id).add(rId);
        await broadcastRoomMembers(io, rId);
        if (typeof cb === 'function') cb({ ok: true });
      } catch (e) {
        logger.error('chat:join error', e);
        if (typeof cb === 'function') cb({ ok: false, error: e.message });
      }
    });

    socket.on('chat:leave', (roomId) => {
      const rId = String(roomId);
      const roomName = `${ROOM_PREFIX}${rId}`;
      socket.leave(roomName);
      removeSocketFromRoom(io, socket.id, rId);
      socket.to(roomName).emit('chat:user_left', { userId, roomId });
    });

    socket.on('chat:message', async (payload, cb) => {
      try {
        const { roomId, text, audio } = payload || {};
        const hasText = text != null && typeof text === 'string' && text.trim().length > 0;
        const hasAudio = audio != null && typeof audio === 'string' && audio.length > 0;
        if (!roomId || (!hasText && !hasAudio)) {
          if (typeof cb === 'function') cb({ ok: false, error: 'پارامتر نامعتبر' });
          return;
        }
        const canAccess = await ChatService.userCanAccessRoom(roomId, userId);
        if (!canAccess) {
          if (typeof cb === 'function') cb({ ok: false, error: 'دسترسی غیرمجاز' });
          return;
        }
        const message = await ChatService.createMessage(roomId, userId, hasText ? text.trim() : '', hasAudio ? audio : null);
        if (!message) {
          if (typeof cb === 'function') cb({ ok: false, error: 'پیام نامعتبر' });
          return;
        }
        const roomName = `${ROOM_PREFIX}${roomId}`;
        io.to(roomName).emit('chat:new_message', message);
        if (typeof cb === 'function') cb({ ok: true, message });
      } catch (e) {
        logger.error('chat:message error', e);
        if (typeof cb === 'function') cb({ ok: false, error: e.message });
      }
    });

    socket.on('chat:typing_start', (roomId) => {
      if (!roomId) return;
      socket.to(`${ROOM_PREFIX}${roomId}`).emit('chat:typing', { userId, roomId, typing: true });
    });

    socket.on('chat:typing_stop', (roomId) => {
      if (!roomId) return;
      socket.to(`${ROOM_PREFIX}${roomId}`).emit('chat:typing', { userId, roomId, typing: false });
    });

    socket.on('disconnect', () => {
      const rooms = socketRooms.get(socket.id);
      if (rooms) {
        rooms.forEach((rId) => removeSocketFromRoom(io, socket.id, rId));
        socketRooms.delete(socket.id);
      }
    });
  });

  return io;
}
