export interface Message {
  sessionId: string;
  message: string;
  type: MessageType;
  metadata?: Record<string, any>;
}

export enum MessageType {
  USER = 'USER',
  AI = 'AI',
}
