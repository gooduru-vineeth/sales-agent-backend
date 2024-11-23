import mongoose from 'mongoose';
import { Message } from '../types/message';

const MessageSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['USER', 'AI'], required: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true, collection: 'messages' }
);

export default mongoose.model<Message>('Message', MessageSchema);
