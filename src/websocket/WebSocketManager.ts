import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { Session } from '../types/customer';
import { ConversationManager } from '../services/ConversationManager';
import { logger } from '../utils/logger';
import { MessageType } from '../types/message';
import * as MessageRepository from '../repositories/Message';

export class WebSocketManager {
  private io: SocketIOServer;
  private sessions: Map<string, Session>;
  private conversationManager: ConversationManager;

  constructor(server: any, path: string = '/') {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      path: path,
    });
    this.sessions = new Map();
    this.conversationManager = new ConversationManager();
    this.initialize();
  }

  private async createNewSession(sessionId: string): Promise<{
    session: Session;
    welcomeMessage: string;
  }> {
    const session: Session = {
      sessionId,
      context: {},
      currentNodeId: 'welcome',
      conversationHistory: [],
    };

    const welcomeNode = await this.conversationManager.getWelcomeNode();
    const welcomeMessage =
      welcomeNode?.getProcessedPromptTemplate?.(session.context) ?? 'H';

    session.conversationHistory.push(`AI: ${welcomeMessage}`);
    await this.saveMessage(sessionId, welcomeMessage ?? '', MessageType.AI);

    this.sessions.set(sessionId, session);
    logger.debug(`Session created`, { sessionId, session });

    return { session, welcomeMessage };
  }

  private async saveMessage(
    sessionId: string,
    message: string,
    type: MessageType
  ): Promise<void> {
    await MessageRepository.createMessage({
      sessionId,
      message,
      type,
    });
  }

  private async handleUserMessage(
    sessionId: string,
    data: any,
    socket: any
  ): Promise<void> {
    logger.info(`Received message`, { sessionId, userInput: data });

    try {
      const currentSession = this.sessions.get(sessionId);

      if (!currentSession) {
        logger.error(`Session not found`, { sessionId });
        throw new Error('Session not found');
      }

      const { response, updatedSession } =
        await this.conversationManager.handleMessage(data, currentSession);

      this.sessions.set(sessionId, updatedSession);
      logger.debug(`Session updated`, { sessionId, updatedSession });

      this.emitMessage(socket, sessionId, response);
      logger.info(`Sent response`, { sessionId, response });
    } catch (error) {
      this.handleError(error, socket, sessionId);
    }
  }

  private handleError(error: unknown, socket: any, sessionId: string): void {
    logger.error(`Error processing message`, {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    socket.emit('error', {
      type: 'error',
      message: 'Error processing your message',
    });
  }

  private emitMessage(socket: any, sessionId: string, content: string): void {
    socket.emit('message', {
      type: 'message',
      sessionId,
      content,
      timestamp: new Date().toISOString(),
    });
  }

  private handleDisconnect(sessionId: string, socketId: string): void {
    logger.info(`Socket disconnected`, { sessionId, socketId });
    this.sessions.delete(sessionId);
  }

  private initialize() {
    this.io.on('connection', async (socket) => {
      const sessionId = uuidv4();
      logger.info(`New socket connection established`, {
        sessionId,
        socketId: socket.id,
      });

      const { welcomeMessage } = await this.createNewSession(sessionId);

      socket.on('message', async (data) => {
        await this.handleUserMessage(sessionId, data, socket);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(sessionId, socket.id);
      });

      socket.emit('connected', {
        type: 'connected',
        sessionId,
        message: 'Connected to sales agent',
      });

      this.emitMessage(socket, sessionId, welcomeMessage);
      logger.info(`Sent welcome message`, { sessionId });
    });
  }
}
