import { Server as SocketIOServer } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { Session } from "../types/customer";
import { ConversationManager } from "../services/ConversationManager";
import { logger } from "../utils/logger";
import * as AIService from "../services/AIService";

export class WebSocketManager {
  private io: SocketIOServer;
  private sessions: Map<string, Session>;
  private conversationManager: ConversationManager;

  constructor(server: any) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });
    this.sessions = new Map();
    this.conversationManager = new ConversationManager();
    this.initialize();
  }

  private initialize() {
    this.io.on("connection", async (socket) => {
      const sessionId = uuidv4();
      logger.info(`New socket connection established`, {
        sessionId,
        socketId: socket.id,
      });

      const session: Session = {
        session_id: sessionId,
        context: {},
        current_node_id: "welcome",
        conversation_history: [],
      };
      const welcomeNode = await this.conversationManager.getWelcomeNode();
      const welcomeMessage = welcomeNode?.getProcessedPromptTemplate?.(
        session.context
      );
      session.conversation_history.push(`AI: ${welcomeMessage}`);

      this.sessions.set(sessionId, session);
      logger.debug(`Session created`, { sessionId, session });

      socket.on("message", async (data) => {
        logger.info(`Received message`, { sessionId, userInput: data });

        try {
          const currentSession = this.sessions.get(sessionId);

          if (!currentSession) {
            logger.error(`Session not found`, { sessionId });
            throw new Error("Session not found");
          }

          const { response, updatedSession } =
            await this.conversationManager.handleMessage(data, currentSession);

          this.sessions.set(sessionId, updatedSession);
          logger.debug(`Session updated`, { sessionId, updatedSession });

          socket.emit("message", {
            type: "message",
            sessionId,
            content: response,
            timestamp: new Date().toISOString(),
          });
          logger.info(`Sent response`, { sessionId, response });
        } catch (error) {
          logger.error(`Error processing message`, {
            sessionId,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
          });
          socket.emit("error", {
            type: "error",
            message: "Error processing your message",
          });
        }
      });

      socket.on("disconnect", () => {
        logger.info(`Socket disconnected`, { sessionId, socketId: socket.id });
        this.sessions.delete(sessionId);
      });

      socket.emit("connected", {
        type: "connected",
        sessionId,
        message: "Connected to sales agent",
      });
      //  send welcome message
      socket.emit("message", {
        type: "message",
        sessionId,
        content: welcomeMessage,
      });
      logger.info(`Sent welcome message`, { sessionId });
    });
  }
}
