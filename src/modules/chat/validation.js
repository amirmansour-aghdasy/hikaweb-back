import Joi from 'joi';

export const createRoomSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(300).allow('').optional()
});

export const updateRoomSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  description: Joi.string().trim().max(300).allow('').optional()
});

export const sendMessageSchema = Joi.object({
  text: Joi.string().trim().min(1).max(5000).required()
});

export const listMessagesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  before: Joi.date().iso().optional() // cursor for older messages
});
