import mongoose from 'mongoose';
import { Event } from '../types/events';

const EventSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true },
    name: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true, collection: 'events' }
);

export default mongoose.model<Event>('Event', EventSchema);
