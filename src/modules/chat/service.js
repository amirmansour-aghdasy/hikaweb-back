import { ChatRoom, ChatMessage } from './model.js';
import { logger } from '../../utils/logger.js';

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'room';
}

export class ChatService {
  static async listRooms() {
    let rooms = await ChatRoom.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .lean();
    if (rooms.length === 0) {
      const defaultRoom = new ChatRoom({
        name: 'عمومی',
        description: 'اتاق چت پیش‌فرض تیم',
        slug: 'general',
        createdBy: null
      });
      await defaultRoom.save();
      rooms = [defaultRoom.toObject ? defaultRoom.toObject() : defaultRoom];
    }
    return rooms;
  }

  static async getRoomById(id) {
    const room = await ChatRoom.findById(id).populate('createdBy', 'name email').lean();
    if (!room) return null;
    return room;
  }

  static async getRoomBySlug(slug) {
    const room = await ChatRoom.findOne({ slug }).populate('createdBy', 'name email').lean();
    return room;
  }

  static async createRoom(data, userId) {
    const baseSlug = slugify(data.name);
    let slug = baseSlug;
    let counter = 0;
    while (await ChatRoom.findOne({ slug })) {
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }
    const room = new ChatRoom({
      name: data.name.trim(),
      description: (data.description || '').trim(),
      slug,
      createdBy: userId
    });
    await room.save();
    return room.toObject ? room.toObject() : room;
  }

  static async listMessages(roomId, options = {}) {
    const { page = 1, limit = 50, before } = options;
    const query = { room: roomId };
    if (before) query.createdAt = { $lt: new Date(before) };
    const messages = await ChatMessage.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sender', 'name email')
      .lean();
    return messages.reverse();
  }

  static async createMessage(roomId, senderId, text, audio = null) {
    const hasText = text != null && String(text).trim().length > 0;
    const hasAudio = audio != null && String(audio).length > 0;
    if (!hasText && !hasAudio) return null;
    const msg = new ChatMessage({
      room: roomId,
      sender: senderId,
      text: hasText ? String(text).trim() : '',
      audio: hasAudio ? String(audio) : undefined
    });
    await msg.save();
    const populated = await ChatMessage.findById(msg._id).populate('sender', 'name email').lean();
    return populated;
  }

  static async userCanAccessRoom(roomId, userId) {
    const room = await ChatRoom.findById(roomId).lean();
    if (!room) return false;
    return true;
  }
}
