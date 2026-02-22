import mongoose from 'mongoose';

const chatRoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: 100
    },
    description: {
      type: String,
      trim: true,
      maxLength: 300,
      default: ''
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true, collection: 'chat_rooms' }
);

chatRoomSchema.index({ slug: 1 });
chatRoomSchema.index({ createdAt: -1 });

export const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

const chatMessageSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom',
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      trim: true,
      maxLength: 5000,
      default: ''
    },
    audio: {
      type: String,
      default: null
    }
  },
  { timestamps: true, collection: 'chat_messages' }
);

chatMessageSchema.index({ room: 1, createdAt: -1 });
chatMessageSchema.index({ sender: 1, createdAt: -1 });

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
