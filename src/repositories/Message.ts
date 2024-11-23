import Message from '../models/Message';
import { Message as MessageType } from '../types/message';

export const createMessage = async (
  message: MessageType
): Promise<MessageType> => {
  return await Message.create(message);
};

export const getMessagesBySessionId = async (
  sessionId: string
): Promise<MessageType[]> => {
  return await Message.find({ sessionId }).sort({ createdAt: 1 });
};

export const getLatestMessageBySessionId = async (
  sessionId: string
): Promise<MessageType | null> => {
  return await Message.findOne({ sessionId }).sort({ createdAt: -1 });
};

export const getMessagesBySessionIdAndType = async (
  sessionId: string,
  type: 'USER' | 'AI'
): Promise<MessageType[]> => {
  return await Message.find({ sessionId, type }).sort({ createdAt: 1 });
};
