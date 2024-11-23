export interface Customer {
  sessionId: string;
  name: string;
  email: string;
  productChoice?: string;
  conversationHistory?: ConversationEntry[];
}

export interface ConversationEntry {
  timestamp: string;
  context: Record<string, any>;
}

export interface Session {
  sessionId: string;
  context: Record<string, any>;
  currentNodeId: string;
  conversationHistory: string[];
}
