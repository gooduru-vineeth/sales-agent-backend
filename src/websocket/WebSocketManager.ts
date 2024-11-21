import { WebSocket, WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { Session } from '../types/customer';
import { ConversationManager } from '../services/ConversationManager';

export class WebSocketManager {
  private wss: WebSocketServer;
  private sessions: Map<string, Session>;
  private conversationManager: ConversationManager;

  constructor(server: any) {
    this.wss = new WebSocketServer({ server });
    this.sessions = new Map();
    this.conversationManager = new ConversationManager();
    this.initialize();
  }

  private initialize() {
    this.wss.on('connection', (ws: WebSocket) => {
      const sessionId = uuidv4();
      const session: Session = {
        session_id: sessionId,
        context: {},
        current_node_id: 'welcome',
        conversation_history: []
      };

      this.sessions.set(sessionId, session);

      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message);
          const currentSession = this.sessions.get(sessionId);
          
          if (!currentSession) {
            throw new Error('Session not found');
          }

          const { response, updatedSession } = await this.conversationManager.handleMessage(
            currentSession,
            data.content
          );

          this.sessions.set(sessionId, updatedSession);

          ws.send(JSON.stringify({
            type: 'message',
            sessionId,
            content: response,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          console.error('Error processing message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Error processing your message'
          }));
        }
      });

      ws.on('close', () => {
        this.sessions.delete(sessionId);
      });

      // Send initial welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        sessionId,
        message: 'Connected to sales agent'
      }));
    });
  }
} 