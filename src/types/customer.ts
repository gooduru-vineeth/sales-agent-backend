export interface Customer {
  id: string;
  name: string;
  email: string;
  product_choice: string;
  conversation_history: ConversationEntry[];
}

export interface ConversationEntry {
  timestamp: string;
  context: Record<string, any>;
}

export interface Session {
  session_id: string;
  context: Record<string, any>;
  current_node_id: string;
  conversation_history: string[];
} 