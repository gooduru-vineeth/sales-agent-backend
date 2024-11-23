import Event from '../models/Event';
import { Event as EventType } from '../types/events';

export const createEvent = async (event: EventType): Promise<EventType> => {
  return await Event.create(event);
};

export const getEventsBySessionId = async (
  sessionId: string
): Promise<EventType[]> => {
  return await Event.find({ sessionId }).sort({ createdAt: -1 });
};

export const getEventsBySessionIdAndName = async (
  sessionId: string,
  name: string
): Promise<EventType[]> => {
  return await Event.find({ sessionId, name }).sort({ createdAt: -1 });
};

export const getLatestEventBySessionIdAndName = async (
  sessionId: string,
  name: string
): Promise<EventType | null> => {
  return await Event.findOne({ sessionId, name }).sort({ createdAt: -1 });
};
